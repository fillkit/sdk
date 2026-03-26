/**
 * Manages the Options Sheet widget.
 *
 * @remarks
 * This component acts as the main orchestrator for the settings UI. It composes
 * multiple sub-sections (CloudConfig, ProviderMode, Language, Behavior) and
 * handles their state synchronization using Nanostores atoms. It also manages
 * the visibility of the sheet and integrates with the FeedbackManager.
 */

import { logger } from '@/core/Logger.js';
import type { UiInitOptions } from '../UiInjector.js';
import { FillKitIcons } from '../icons.js';
import { setSvgContent } from '../../utils/dom-helpers.js';
import { fillkitApiBaseUrl } from '../../types/cloud.js';
import type { FillMode } from '../../types/index.js';
import { createSectionSpacer } from './options-sheet/form-helpers.js';
import { BehaviorSection } from './options-sheet/BehaviorSection.js';
import { LanguageSection } from './options-sheet/LanguageSection.js';
import { ProviderModeSection } from './options-sheet/ProviderModeSection.js';
import { CloudConfigSection } from './options-sheet/CloudConfigSection.js';
import { FeedbackDisplay } from './options-sheet/FeedbackDisplay.js';
import type { DatasetStats, OptionChangeValue } from './options-sheet/types.js';
import type { FeedbackManager, FeedbackOptions } from '../FeedbackManager.js';
import {
  sdkOptions,
  cloudConfig,
  uiConfig,
  widgetState,
  type ResolvedUiVisibility,
} from '../../state/atoms/index.js';

/**
 * Renders and manages the FillKit settings modal.
 */
export class OptionsSheet {
  private optionsSheet: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private feedbackManager: FeedbackManager;
  private unsubscribeSdkOptions?: () => void;
  private unsubscribeCloudConfig?: () => void;
  private unsubscribeUiConfig?: () => void;
  private handleOverlayClick: () => void = () => {};
  private previousFocus: Element | null = null;
  private handleFocusTrap: ((e: KeyboardEvent) => void) | null = null;

  // Child components
  private feedbackDisplay: FeedbackDisplay | null = null;
  private cloudSection: CloudConfigSection | null = null;
  private providerModeSection: ProviderModeSection | null = null;
  private languageSection: LanguageSection | null = null;
  private behaviorSection: BehaviorSection | null = null;

  // Spacer elements for visibility management
  private cloudSpacer: HTMLElement | null = null;
  private providerModeSpacer: HTMLElement | null = null;
  private languageSpacer: HTMLElement | null = null;

  /**
   * Initializes a new instance of the OptionsSheet class.
   *
   * @param feedbackManager - The manager instance for handling feedback events.
   */
  constructor(feedbackManager: FeedbackManager) {
    this.feedbackManager = feedbackManager;

    // Create FeedbackDisplay component
    this.feedbackDisplay = new FeedbackDisplay(feedbackManager);

    // Subscribe to atom changes
    this.unsubscribeSdkOptions = sdkOptions.subscribe(opts => {
      this.handleSdkOptionsChange(opts);
    });
    this.unsubscribeCloudConfig = cloudConfig.subscribe(cfg => {
      this.handleCloudConfigChange(cfg);
    });
    this.unsubscribeUiConfig = uiConfig.subscribe(cfg => {
      this.applyVisibility(cfg.visibility);
    });
  }

  /**
   * Handles updates from the SDK options atom.
   *
   * @remarks
   * Triggered whenever the global SDK options change. Updates the internal form state
   * to reflect the new values.
   *
   * @param _opts - The new SDK options state.
   */
  private handleSdkOptionsChange(
    _opts: typeof sdkOptions extends import('nanostores').Atom<infer T>
      ? T
      : never
  ): void {
    this.updateFormState();
  }

  /**
   * Handles updates from the cloud configuration atom.
   *
   * @remarks
   * Triggered whenever cloud credentials or project settings change.
   * Currently a placeholder for potential future logic, as the CloudConfigSection
   * handles its own updates.
   *
   * @param _cfg - The new cloud configuration state.
   */
  private handleCloudConfigChange(
    _cfg: typeof cloudConfig extends import('nanostores').Atom<infer T>
      ? T
      : never
  ): void {
    // Intentionally empty — CloudConfigSection manages its own state
  }

  /**
   * Creates and initializes the options sheet DOM structure.
   *
   * @remarks
   * Constructs the header, feedback display, and the main options form containing
   * all sub-sections.
   *
   * @param overlay - The background overlay element to attach to.
   * @returns The constructed options sheet HTMLElement.
   */
  create(overlay: HTMLElement): HTMLElement {
    this.overlay = overlay;
    this.optionsSheet = document.createElement('div');
    this.optionsSheet.className = 'fillkit-options-sheet';
    this.optionsSheet.setAttribute('role', 'dialog');
    this.optionsSheet.setAttribute('aria-modal', 'true');
    this.optionsSheet.setAttribute('aria-label', 'FillKit settings');

    // Header
    const header = this.createHeader();

    // Feedback display (below header subtitle)
    const feedbackElement = this.feedbackDisplay?.getElement();

    // Options form
    const form = this.createOptionsForm();

    this.optionsSheet.appendChild(header);
    if (feedbackElement) {
      this.optionsSheet.appendChild(feedbackElement);
    }
    this.optionsSheet.appendChild(form);

    // Initialize form state with current options
    this.updateFormState();

    return this.optionsSheet;
  }

  /**
   * Creates the header section of the options sheet.
   *
   * @returns The constructed header HTMLElement.
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'fillkit-options-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'fillkit-options-title-group';

    const brandLogo = document.createElement('span');
    brandLogo.className = 'fillkit-sheet-brand';
    setSvgContent(brandLogo, FillKitIcons.brandRect);

    const subtitle = document.createElement('p');
    subtitle.className = 'fillkit-options-subtitle';
    subtitle.textContent = 'Configure FillKit behavior';

    titleGroup.appendChild(brandLogo);
    titleGroup.appendChild(subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'fillkit-options-close';
    closeBtn.setAttribute('aria-label', 'Close settings');
    setSvgContent(closeBtn, FillKitIcons.close);
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(titleGroup);
    header.appendChild(closeBtn);

    return header;
  }

  /**
   * Creates the main form container and initializes all child sections.
   *
   * @remarks
   * Instantiates `CloudConfigSection`, `ProviderModeSection`, `LanguageSection`,
   * and `BehaviorSection`, wiring up their event handlers and appending them to the form.
   *
   * @returns The constructed form HTMLElement.
   */
  private createOptionsForm(): HTMLElement {
    const form = document.createElement('div');
    form.className = 'fillkit-options-form';

    const opts = sdkOptions.get();
    const vis = uiConfig.get().visibility;

    // Resolve field-level visibility for each section
    const cloudFieldVis =
      vis.cloudConfig !== false ? vis.cloudConfig : undefined;
    const providerModeFieldVis =
      vis.providerMode !== false ? vis.providerMode : undefined;
    const behaviorFieldVis = vis.behavior !== false ? vis.behavior : undefined;

    // Initialize child components with field visibility
    this.cloudSection = new CloudConfigSection(
      {
        onSaveApiKey: apiKey => this.saveAndFetchProjects(apiKey),
        onLoadProjects: apiKey => this.loadProjectsList(apiKey),
        onSelectProject: projectId => this.handleProjectSelect(projectId),
        onScanPage: () => this.scanPageForCloud(),
        onSyncDatasets: () => this.syncCloudDatasets(),
        onScanUrls: (urls, onProgress) =>
          this.scanMultipleUrls(urls, onProgress),
      },
      cloudFieldVis
    );

    this.providerModeSection = new ProviderModeSection(
      opts.provider,
      opts.mode,
      (field, value) => this.handleOptionChange(field, value),
      providerModeFieldVis
    );

    this.languageSection = new LanguageSection(opts.locale, (field, value) =>
      this.handleOptionChange(field, value)
    );

    this.behaviorSection = new BehaviorSection(
      {
        refill: opts.refill,
        watchMode: opts.watchMode,
        includeOutsideForms: opts.includeOutsideForms,
        emailDomain: opts.emailDomain,
        includeSelectors: opts.includeSelectors,
        excludeSelectors: opts.excludeSelectors,
        overrides: opts.overrides,
      },
      opts.provider,
      (field, value) => this.handleOptionChange(field, value),
      behaviorFieldVis
    );

    // Assemble form — conditionally include sections based on visibility
    form.appendChild(this.cloudSection.create());
    this.cloudSpacer = createSectionSpacer();
    form.appendChild(this.cloudSpacer);
    form.appendChild(this.providerModeSection.create());
    this.providerModeSpacer = createSectionSpacer();
    form.appendChild(this.providerModeSpacer);
    form.appendChild(this.languageSection.create());
    this.languageSpacer = createSectionSpacer();
    form.appendChild(this.languageSpacer);
    form.appendChild(this.behaviorSection.create());

    // Setup provider visibility logic
    this.setupProviderVisibility();

    // Apply initial visibility from config
    this.applyVisibility(vis);

    return form;
  }

  /**
   * Sets up dynamic visibility logic for sections based on the selected provider.
   *
   * @remarks
   * Toggles the visibility of the Cloud Config and Language sections depending on
   * whether 'cloud' or 'local' provider is selected.
   */
  private setupProviderVisibility(): void {
    if (
      !this.providerModeSection ||
      !this.cloudSection ||
      !this.languageSection
    )
      return;

    const providerElement = this.providerModeSection.getProviderElement();
    if (!providerElement) return;

    const updateSections = () => {
      const vis = uiConfig.get().visibility;
      const isCloud = providerElement.value === 'cloud';

      if (this.cloudSection) {
        // Only show cloud section if visibility allows AND provider is cloud
        if (isCloud && vis.cloudConfig !== false) {
          this.cloudSection.show();
          if (this.cloudSpacer) this.cloudSpacer.style.display = '';

          // Auto-load saved credentials when switching to cloud
          const cfg = cloudConfig.get();
          if (cfg.token && cfg.projectId) {
            this.cloudSection.loadCredentials(cfg);
            this.feedbackManager.show({
              type: 'success',
              scope: 'cloud',
              message: 'Cloud provider activated with saved credentials',
              persistent: false,
            });
          } else if (cfg.token && !cfg.projectId) {
            this.cloudSection.loadCredentials(cfg);
            this.feedbackManager.show({
              type: 'info',
              scope: 'cloud',
              message: 'Select a project to complete activation',
              persistent: false,
            });
          }
        } else {
          this.cloudSection.hide();
          if (this.cloudSpacer) this.cloudSpacer.style.display = 'none';
        }
      }
      if (this.languageSection) {
        // Only show language section if visibility allows AND provider is local
        if (isCloud || !vis.language) {
          this.languageSection.hide();
          if (this.languageSpacer) this.languageSpacer.style.display = 'none';
        } else {
          this.languageSection.show();
          if (this.languageSpacer) this.languageSpacer.style.display = '';
        }
      }
    };

    providerElement.addEventListener('change', updateSections);
    updateSections();
  }

  /**
   * Handles changes to individual configuration options.
   *
   * @remarks
   * Updates the corresponding Nanostores atom, which automatically triggers persistence
   * and notifies subscribers.
   *
   * @param field - The name of the option being changed.
   * @param value - The new value for the option.
   */
  private async handleOptionChange(
    field: string,
    value: OptionChangeValue
  ): Promise<void> {
    const currentOpts = sdkOptions.get();

    // Update appropriate atom based on field
    switch (field) {
      case 'mode':
        sdkOptions.set({ ...currentOpts, mode: value as FillMode });
        break;
      case 'provider':
        sdkOptions.set({
          ...currentOpts,
          provider: value as 'local' | 'cloud',
        });
        break;
      case 'locale':
        sdkOptions.set({ ...currentOpts, locale: value as string });
        break;
      case 'refill':
        sdkOptions.set({ ...currentOpts, refill: value as boolean });
        break;
      case 'watchMode':
        sdkOptions.set({ ...currentOpts, watchMode: value as boolean });
        break;
      case 'includeOutsideForms':
        sdkOptions.set({
          ...currentOpts,
          includeOutsideForms: value as boolean,
        });
        break;
      case 'emailDomain':
        sdkOptions.set({ ...currentOpts, emailDomain: value as string });
        break;
      case 'includeSelectors':
        sdkOptions.set({
          ...currentOpts,
          includeSelectors: value as string[],
        });
        break;
      case 'excludeSelectors':
        sdkOptions.set({
          ...currentOpts,
          excludeSelectors: value as string[],
        });
        break;
      case 'overrides':
        sdkOptions.set({
          ...currentOpts,
          overrides: value as Record<string, string | number | boolean | null>,
        });
        break;
      default:
        logger.warn(`OptionsSheet: Unknown field ${field}`);
    }
  }

  /**
   * Update options from parent
   * @deprecated Options are now in atoms
   */
  updateOptions(_options: UiInitOptions): void {
    // This method is deprecated - components now subscribe to atoms directly
    // Keeping it for backward compatibility but it does nothing
  }

  /**
   * Synchronizes the form UI with the current state from atoms.
   *
   * @remarks
   * Propagates current values to all child sections (`ProviderModeSection`,
   * `LanguageSection`, `BehaviorSection`) to ensure the UI is consistent.
   */
  private updateFormState(): void {
    if (!this.optionsSheet) return;

    const opts = sdkOptions.get();

    // Update child components
    if (this.providerModeSection) {
      this.providerModeSection.updateValues(opts.provider, opts.mode);
    }

    if (this.languageSection) {
      this.languageSection.updateLocale(opts.locale);
    }

    if (this.behaviorSection) {
      this.behaviorSection.updateValues({
        refill: opts.refill,
        watchMode: opts.watchMode,
        includeOutsideForms: opts.includeOutsideForms,
        emailDomain: opts.emailDomain,
        includeSelectors: opts.includeSelectors,
        excludeSelectors: opts.excludeSelectors,
        overrides: opts.overrides,
      });
    }
  }

  /**
   * Applies section-level visibility from the resolved visibility config.
   * Called reactively when `uiConfig.visibility` changes.
   */
  private applyVisibility(vis: ResolvedUiVisibility): void {
    if (!this.optionsSheet) return;

    // Cloud section — provider-driven visibility is handled by
    // setupProviderVisibility(); here we only force-hide when visibility says false
    if (vis.cloudConfig === false && this.cloudSection) {
      this.cloudSection.hide();
      if (this.cloudSpacer) this.cloudSpacer.style.display = 'none';
    }

    // Provider/Mode section
    if (this.providerModeSection) {
      if (vis.providerMode === false) {
        this.providerModeSection.hide();
        if (this.providerModeSpacer)
          this.providerModeSpacer.style.display = 'none';
      } else {
        this.providerModeSection.show();
        if (this.providerModeSpacer) this.providerModeSpacer.style.display = '';
      }
    }

    // Language section — also controlled by provider; only force-hide here
    if (vis.language === false && this.languageSection) {
      this.languageSection.hide();
      if (this.languageSpacer) this.languageSpacer.style.display = 'none';
    }

    // Behavior section
    if (this.behaviorSection) {
      if (vis.behavior === false) {
        this.behaviorSection.hide();
      } else {
        this.behaviorSection.show();
      }
    }
  }

  /**
   * Opens the options sheet and shows the overlay.
   *
   * @remarks
   * Updates the global widget state, refreshes the form state, and attempts to
   * restore cloud credentials if applicable.
   */
  async open(): Promise<void> {
    if (!this.optionsSheet || !this.overlay) return;

    // Store currently focused element for restoration on close
    this.previousFocus = document.activeElement;

    this.overlay.classList.add('visible');
    this.optionsSheet.classList.add('visible');

    // Update widget state atom
    widgetState.set({ ...widgetState.get(), optionsSheetOpen: true });

    this.updateFormState();

    // Setup overlay click handler (remove old listener to prevent stacking)
    this.overlay.removeEventListener('click', this.handleOverlayClick);
    this.handleOverlayClick = () => {
      this.close();
    };
    this.overlay.addEventListener('click', this.handleOverlayClick);

    // Mark background as inert for accessibility
    document.body.inert = true;
    // Ensure the sheet itself remains interactive
    if (this.optionsSheet.parentElement) {
      this.optionsSheet.parentElement.inert = false;
    }
    this.optionsSheet.inert = false;
    this.overlay.inert = false;

    // Setup focus trap
    this.setupFocusTrap();

    // Focus the close button for keyboard users
    const closeBtn = this.optionsSheet.querySelector<HTMLElement>(
      '.fillkit-options-close'
    );
    closeBtn?.focus();

    // Restore cloud credentials from cloudConfig atom if cloud provider
    if (this.providerModeSection) {
      const isCloud = this.providerModeSection.getProvider() === 'cloud';
      if (isCloud && this.cloudSection) {
        const cfg = cloudConfig.get();
        if (cfg.token) {
          this.cloudSection.loadCredentials(cfg);
        }
      }
    }
  }

  /**
   * Closes the options sheet and hides the overlay.
   *
   * @remarks
   * Updates the global widget state to reflect that the sheet is closed.
   */
  async close(): Promise<void> {
    if (!this.optionsSheet || !this.overlay) return;

    // Update widget state atom
    widgetState.set({ ...widgetState.get(), optionsSheetOpen: false });

    this.overlay.classList.remove('visible');
    this.optionsSheet.classList.remove('visible');

    // Remove inert from background
    document.body.inert = false;

    // Remove focus trap
    this.removeFocusTrap();

    // Restore focus to previously focused element
    if (this.previousFocus instanceof HTMLElement) {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
  }

  /**
   * Toggles the visibility of the options sheet.
   */
  async toggle(): Promise<void> {
    const isOpen = this.optionsSheet?.classList.contains('visible');
    if (isOpen) {
      await this.close();
    } else {
      await this.open();
    }
  }

  /**
   * Checks if the options sheet is currently visible.
   *
   * @returns `true` if the sheet is open, `false` otherwise.
   */
  isOpen(): boolean {
    return this.optionsSheet?.classList.contains('visible') || false;
  }

  /**
   * Initiates the process of saving an API key and fetching associated projects.
   *
   * @remarks
   * Dispatches a custom event `fillkit:saveAndFetchProjects` to be handled by the core logic.
   *
   * @param apiKey - The API key to validate and save.
   */
  private async saveAndFetchProjects(apiKey: string): Promise<void> {
    if (!apiKey) {
      this.showCloudStatus('error', 'API key is required');
      return;
    }

    this.showCloudStatus('loading', 'Loading your projects...');

    const event = new CustomEvent('fillkit:saveAndFetchProjects', {
      detail: { apiKey },
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  /**
   * Requests a refresh of the projects list for the given API key.
   *
   * @remarks
   * Dispatches a custom event `fillkit:loadProjects`.
   *
   * @param apiKey - The API key to use for fetching projects.
   */
  private async loadProjectsList(apiKey: string): Promise<void> {
    if (!apiKey) {
      this.showCloudStatus('error', 'Enter your API key first');
      return;
    }

    this.showCloudStatus('loading', 'Loading your projects...');

    const event = new CustomEvent('fillkit:loadProjects', {
      detail: { apiKey },
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  /**
   * Handles the selection of a project from the cloud configuration section.
   *
   * @remarks
   * Updates the cloud configuration atom, switches the provider to 'cloud',
   * and dispatches activation events.
   *
   * @param projectId - The ID of the selected project.
   */
  private async handleProjectSelect(projectId: string): Promise<void> {
    if (!projectId) {
      if (this.cloudSection) {
        this.cloudSection.hideActions();
      }
      return;
    }

    // Get credentials from cloudConfig atom
    const cfg = cloudConfig.get();
    if (!cfg.token) {
      logger.error('FillKit: Cannot select project - no credentials found');
      return;
    }

    // Update selected project in cloudConfig atom
    cloudConfig.set({ ...cfg, projectId });

    // Switch to cloud provider
    sdkOptions.set({ ...sdkOptions.get(), provider: 'cloud' });

    if (this.cloudSection) {
      this.cloudSection.showActions();
    }

    const event = new CustomEvent('fillkit:activateCloudProvider', {
      detail: { apiKey: cfg.token, projectId },
      bubbles: true,
    });
    document.dispatchEvent(event);

    // Find project name
    const project = cfg.projects.find(p => p.id === projectId);
    const projectName = project?.name || projectId;

    this.showCloudStatus('success', `Project selected: ${projectName}`);
  }

  /**
   * Initiates a page scan using the cloud provider.
   *
   * @remarks
   * Dispatches a `fillkit:scanPage` event.
   */
  private async scanPageForCloud(): Promise<void> {
    this.showCloudStatus('loading', 'Scanning page...');

    const event = new CustomEvent('fillkit:scanPage', {
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  /**
   * Initiates a synchronization of cloud datasets.
   *
   * @remarks
   * Dispatches a `fillkit:syncDatasets` event.
   */
  private async syncCloudDatasets(): Promise<void> {
    this.showCloudStatus('loading', 'Syncing datasets...');

    const event = new CustomEvent('fillkit:syncDatasets', {
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  /**
   * Initiates a bulk scan of multiple URLs.
   *
   * @remarks
   * Dispatches a `fillkit:scanUrls` event with the list of URLs and a progress callback.
   *
   * @param urls - The list of URLs to scan.
   * @param onProgress - Callback to report scanning progress.
   */
  private async scanMultipleUrls(
    urls: string[],
    onProgress: (current: number, total: number) => void
  ): Promise<void> {
    const event = new CustomEvent('fillkit:scanUrls', {
      detail: { urls, onProgress },
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  /**
   * Displays a status message related to cloud operations.
   *
   * @remarks
   * Delegates to the `FeedbackManager` to show the message. Automatically dismisses
   * previous cloud-scoped messages of the same type to prevent stacking.
   *
   * @param type - The type of message ('loading', 'success', 'error').
   * @param message - The text content of the message.
   * @param showSaaSLink - Whether to include a link to the dashboard (default: false).
   */
  showCloudStatus(
    type: 'loading' | 'success' | 'error',
    message: string,
    showSaaSLink = false
  ): void {
    // Dismiss any previous cloud messages of the same type
    // This prevents duplicate loading/success/error messages stacking
    const existingMessages = this.feedbackManager.getMessages({
      scope: 'cloud',
      dismissed: false,
    });
    existingMessages.forEach(msg => {
      if (msg.type === type) {
        this.feedbackManager.dismiss(msg.id);
      }
    });

    // Show new feedback message
    const feedbackOptions: FeedbackOptions = {
      type,
      scope: 'cloud',
      message,
      persistent: type === 'error', // Errors persist, others auto-dismiss
      ...(showSaaSLink || (type === 'error' && message.includes('Invalid'))
        ? {
            action: {
              label: 'Go to Dashboard',
              handler: () => {
                window.open(fillkitApiBaseUrl, '_blank');
              },
            },
          }
        : {}),
    };

    this.feedbackManager.show(feedbackOptions);
  }

  /**
   * Processes the result of a "save and fetch projects" operation.
   *
   * @remarks
   * Updates the cloud configuration atom with the new credentials and projects list.
   * Auto-selects the first project if available.
   *
   * @param result - The result object containing success status, API key, projects, or error.
   */
  handleSaveAndFetchProjectsResult(result: {
    success: boolean;
    apiKey: string;
    projects: Array<{ id: string; name: string; description?: string }>;
    error?: string;
  }): void {
    if (!result.success) {
      this.showCloudStatus(
        'error',
        result.error || 'Failed to fetch projects',
        true
      );
      return;
    }

    if (!this.cloudSection) return;

    // Convert to CloudProject format
    const cloudProjects = result.projects.map(
      (
        p: Record<string, unknown> & {
          id: string;
          name: string;
          description?: string;
        }
      ) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
        updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
        ownerId: typeof p.ownerId === 'string' ? p.ownerId : '',
        settings:
          p.settings && typeof p.settings === 'object'
            ? (p.settings as Record<string, unknown>)
            : {},
        datasetCount: typeof p.datasetCount === 'number' ? p.datasetCount : 0,
        schemaCount: typeof p.schemaCount === 'number' ? p.schemaCount : 0,
      })
    );

    const credentials = {
      token: result.apiKey,
      projectId: result.projects[0]?.id || null,
      projects: cloudProjects,
      dataset: null,
      savedAt: Date.now(),
    };

    // Save to cloudConfig atom (atom handles persistence automatically)
    cloudConfig.set(credentials);

    // Load into cloud section
    this.cloudSection.loadCredentials(credentials);

    // Auto-select first project
    if (result.projects.length > 0) {
      this.showCloudStatus(
        'success',
        `Connected successfully. Found ${result.projects.length} project${result.projects.length !== 1 ? 's' : ''}.`
      );

      this.cloudSection.showActions();
    } else {
      this.showCloudStatus(
        'error',
        'No projects found. Create your first project in the dashboard.',
        true
      );
    }
  }

  /**
   * Handles the result of a projects list refresh.
   *
   * @remarks
   * Displays a success message with the count of found projects.
   *
   * @param projects - The list of projects retrieved.
   */
  async handleProjectsList(
    projects: Array<{ id: string; name: string; description?: string }>
  ): Promise<void> {
    // This will be populated through storage and loadCredentials
    this.showCloudStatus(
      'success',
      `Found ${projects.length} project${projects.length !== 1 ? 's' : ''}`
    );
  }

  /**
   * Updates the dataset statistics in the Cloud Config section.
   *
   * @param stats - The new dataset statistics.
   */
  updateDatasetStatus(stats: DatasetStats): void {
    if (this.cloudSection) {
      this.cloudSection.updateDatasetStats(stats);
    }
  }

  /**
   * Shows the actions area in the Cloud Config section.
   */
  showCloudActions(): void {
    if (this.cloudSection) {
      this.cloudSection.showActions();
    }
  }

  /**
   * Hides the actions area in the Cloud Config section.
   */
  hideCloudActions(): void {
    if (this.cloudSection) {
      this.cloudSection.hideActions();
    }
  }

  /**
   * Sets up a focus trap within the options sheet dialog.
   *
   * @remarks
   * Traps Tab and Shift+Tab within the dialog, cycling between the first and last
   * focusable elements. Also handles Escape key to close the dialog.
   */
  private setupFocusTrap(): void {
    this.removeFocusTrap();

    this.handleFocusTrap = (e: KeyboardEvent) => {
      if (!this.optionsSheet) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = this.optionsSheet.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab from first element wraps to last
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab from last element wraps to first
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener('keydown', this.handleFocusTrap);
  }

  /**
   * Removes the focus trap event listener.
   */
  private removeFocusTrap(): void {
    if (this.handleFocusTrap) {
      document.removeEventListener('keydown', this.handleFocusTrap);
      this.handleFocusTrap = null;
    }
  }

  /**
   * Destroys the options sheet and cleans up resources.
   *
   * @remarks
   * Unsubscribes from atoms, destroys child components, and removes the sheet from the DOM.
   */
  destroy(): void {
    // Remove focus trap
    this.removeFocusTrap();
    this.previousFocus = null;

    // Unsubscribe from atoms
    if (this.unsubscribeSdkOptions) {
      this.unsubscribeSdkOptions();
      this.unsubscribeSdkOptions = undefined;
    }
    if (this.unsubscribeCloudConfig) {
      this.unsubscribeCloudConfig();
      this.unsubscribeCloudConfig = undefined;
    }
    if (this.unsubscribeUiConfig) {
      this.unsubscribeUiConfig();
      this.unsubscribeUiConfig = undefined;
    }

    // Destroy feedback display
    if (this.feedbackDisplay) {
      this.feedbackDisplay.destroy();
      this.feedbackDisplay = null;
    }

    if (this.optionsSheet) {
      this.optionsSheet.remove();
      this.optionsSheet = null;
    }
  }
}
