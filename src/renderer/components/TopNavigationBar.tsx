/**
 * TopNavigationBar component with navigation menu and dropdown menus.
 *
 * This component provides the main navigation interface for the application,
 * including logo, navigation menu, user menu, and action buttons. It supports
 * both desktop and mobile layouts with responsive design.
 *
 * @module TopNavigationBar
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import {
  Menu,
  FolderOpen,
  Search,
  Edit,
  BarChart3,
  HelpCircle,
  Lock,
  Upload,
} from 'lucide-react';
import { ArcElectLogo } from './ui/arc-elect-logo';
import { ModeToggle } from './ModeToggle';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { Button } from './ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from './ui/navigation-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { ProjectRequiredModal } from './ProjectRequiredModal';
import { RamlImportModal } from './RamlImportModal';
import type { RamlImportConfig, ImportResult } from '../../types/raml-import';
import type { ProjectConfig } from '../../types/schema-editor';
import React from 'react';

import { useAppStore } from '../stores/useAppStore';

/**
 * Interface defining the structure of a menu item.
 */
interface MenuItem {
  /** Display title of the menu item */
  title: string;
  /** URL for external links */
  url?: string;
  /** Internal page route */
  page?: 'project' | 'explore' | 'build' | 'analytics';
  /** Description for dropdown items */
  description?: string;
  /** Icon component for the menu item */
  icon?: React.ReactNode;
  /** Submenu items for dropdown menus */
  items?: MenuItem[];
}

/**
 * Interface defining the props for the TopNavigationBar component.
 */
interface TopNavigationBarProps {
  /** Logo configuration */
  logo?: {
    /** URL for logo link */
    url: string;
    /** Source path for logo image */
    src: string;
    /** Alt text for logo image */
    alt: string;
    /** Title text for logo */
    title: string;
  };
  /** Menu items configuration */
  menu?: MenuItem[];
  /** Authentication configuration */
  auth?: {
    /** Login button configuration */
    login: {
      /** Login button title */
      title: string;
      /** Login URL */
      url: string;
    };
    /** Signup button configuration */
    signup: {
      /** Signup button title */
      title: string;
      /** Signup URL */
      url: string;
    };
  };
}

/**
 * Default application name from environment variables.
 */
const appName = import.meta.env.VITE_APP_NAME || 'App';

/**
 * Default menu configuration for the navigation bar.
 */
const defaultMenu: MenuItem[] = [
  {
    title: 'Projects',
    page: 'project',
    icon: <FolderOpen className="size-5 shrink-0" />,
  },
  {
    title: 'Explore',
    page: 'explore',
    icon: <Search className="size-5 shrink-0" />,
    items: [
      {
        title: 'Browse Schemas',
        page: 'explore',
        icon: <Search className="size-4" />,
      },
      {
        title: 'Analytics',
        page: 'analytics',
        icon: <BarChart3 className="size-4" />,
      },
    ],
  },
  {
    title: 'Build',
    page: 'build',
    icon: <Edit className="size-5 shrink-0" />,
  },
];

/**
 * TopNavigationBar component for main application navigation.
 *
 * This component renders a responsive navigation bar with:
 * - Application logo and branding
 * - Main navigation menu with dropdowns
 * - User menu and authentication
 * - Action buttons (search, settings, help)
 * - Mobile-responsive design with hamburger menu
 *
 * @param props - Component props
 * @param props.logo - Logo configuration
 * @param props.menu - Menu items configuration
 * @param props.auth - Authentication configuration
 * @returns JSX element representing the navigation bar
 *
 * @example
 * ```tsx
 * <TopNavigationBar
 *   logo={{ title: "My App", url: "#", src: "", alt: "logo" }}
 *   menu={customMenu}
 * />
 * ```
 */
const TopNavigationBar = ({
  logo: _logo = {
    url: '#',
    src: '',
    alt: 'logo',
    title: appName,
  },
  menu = defaultMenu,
}: TopNavigationBarProps) => {
  const setPage = useAppStore((state) => state.setPage);
  const currentPage = useAppStore((state) => state.currentPage);
  const currentProject = useAppStore((state) => state.currentProject);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isRamlImportOpen, setIsRamlImportOpen] = React.useState(false);
  const createProject = useAppStore((s) => s.createProject);

  /**
   * Handles logo click to navigate to projects page.
   */
  const handleLogoClick = () => {
    setPage('project');
  };

  /**
   * Handles page navigation.
   *
   * @param page - The page to navigate to
   */
  const handlePageChange = (
    page: 'project' | 'explore' | 'build' | 'analytics',
  ) => {
    const requiresProject = page !== 'project';
    if (requiresProject && !currentProject) {
      setIsModalOpen(true);
      return;
    }
    setPage(page);
  };

  const handleRamlImportConfig = React.useCallback(
    async (
      config: RamlImportConfig,
      projectName?: string,
    ): Promise<ImportResult> => {
      try {
        const result = await window.api.convertRamlBatch({
          sourceDirectory: config.sourcePath,
          destinationDirectory: config.destinationPath,
          options: config.transformationOptions,
        });

        if (result.success) {
          if (projectName && projectName.trim()) {
            const projectConfig: ProjectConfig = {
              name: projectName.trim(),
              path: config.destinationPath,
              schemaPattern: '*.json',
              settings: {
                autoValidate: true,
                watchForChanges: true,
                maxFileSize: 10 * 1024 * 1024,
                allowedExtensions: ['.json'],
              },
            };
            await createProject(projectConfig);
          }

          const fallbackSummary = result.summaryDetailed
            ? result.summaryDetailed
            : {
                filesProcessed: result.summary.total,
                enumsCreated: 0,
                businessObjectsCreated: result.summary.successful,
                unionsCount: 0,
                inlineEnumsExtracted: 0,
                dedupedEnums: 0,
                warningsCount: result.summary.warnings,
                errorsCount: result.summary.failed,
                durationMs: 0,
                outputDirectory: config.destinationPath,
              };

          return {
            success: true,
            processedFiles: result.summary.total,
            convertedFiles: result.summary.successful,
            failedFiles: result.summary.failed,
            errors: (
              result.results as Array<{
                success: boolean;
                inputFile?: string;
                error?: string;
              }>
            )
              .filter((r) => !r.success)
              .map((r) => ({
                filePath: r.inputFile || 'unknown',
                message: r.error || 'Conversion failed',
                type: 'conversion' as const,
              })),
            warnings: [],
            duration: 0,
            timestamp: new Date(),
            summary: fallbackSummary,
            reports: result.reports || [],
          };
        }

        return {
          success: false,
          processedFiles: 0,
          convertedFiles: 0,
          failedFiles: 0,
          errors: [
            {
              filePath: 'unknown',
              message: result.error || 'Unknown error',
              type: 'filesystem',
            },
          ],
          warnings: [],
          duration: 0,
          timestamp: new Date(),
        };
      } catch (error) {
        return {
          success: false,
          processedFiles: 0,
          convertedFiles: 0,
          failedFiles: 0,
          errors: [
            {
              filePath: 'unknown',
              message: error instanceof Error ? error.message : 'Unknown error',
              type: 'filesystem',
            },
          ],
          warnings: [],
          duration: 0,
          timestamp: new Date(),
        };
      }
    },
    [createProject],
  );

  React.useEffect(() => {
    const handler = () => setIsModalOpen(true);
    document.addEventListener('show-project-required-modal', handler);
    return () =>
      document.removeEventListener('show-project-required-modal', handler);
  }, []);

  return (
    <section className="py-4 border-b border-border/40">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center justify-between w-full">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <button
              onClick={handleLogoClick}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <ArcElectLogo className="h-8 w-auto" />
            </button>
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList>
                  {menu.map((item) =>
                    renderMenuItem(
                      item,
                      currentPage,
                      !!currentProject,
                      handlePageChange,
                    ),
                  )}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          {/* Right side - RAML import, theme and help */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRamlImportOpen(true)}
                  title="Import RAML"
                >
                  <Upload className="size-4" />
                  Import RAML
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Import RAML</p>
              </TooltipContent>
            </Tooltip>
            <ModeToggle />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    document.dispatchEvent(new CustomEvent('show-help-modal'));
                  }}
                  title="Keyboard shortcuts help"
                >
                  <HelpCircle className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Help</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </nav>

        {/* Project Required Modal */}
        <ProjectRequiredModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />

        {/* RAML Import Modal */}
        <RamlImportModal
          isOpen={isRamlImportOpen}
          onClose={() => setIsRamlImportOpen(false)}
          onImport={handleRamlImportConfig}
        />

        {/* Mobile Menu */}
        <div className="flex justify-between md:hidden">
          <button
            onClick={handleLogoClick}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <ArcElectLogo className="h-6 w-auto" />
          </button>

          <Sheet>
            <SheetTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Navigation menu</p>
                </TooltipContent>
              </Tooltip>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <Accordion type="single" collapsible>
                  {menu.map((item) =>
                    renderMobileMenuItem(item, currentPage, handlePageChange),
                  )}
                </Accordion>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </section>
  );
};

/**
 * Renders a menu item for the desktop navigation menu.
 *
 * @param item - The menu item to render
 * @param currentPage - The currently active page
 * @param handlePageChange - Function to handle page navigation
 * @returns JSX element representing the menu item
 */
const renderMenuItem = (
  item: MenuItem,
  currentPage: string,
  hasProject: boolean,
  handlePageChange: (
    page: 'project' | 'explore' | 'build' | 'analytics',
  ) => void,
) => {
  if (item.items) {
    return (
      <NavigationMenuItem key={item.title}>
        <NavigationMenuTrigger className="text-muted-foreground hover:text-foreground">
          <div className="flex items-center gap-2">
            {item.icon}
            {item.title}
          </div>
        </NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul className="grid w-[200px] gap-1 p-2">
            {item.items.map((subItem) => {
              const disabled =
                !!subItem.page && subItem.page !== 'project' && !hasProject;
              return (
                <li key={subItem.title}>
                  <NavigationMenuLink asChild>
                    <button
                      onClick={() =>
                        subItem.page && handlePageChange(subItem.page)
                      }
                      className={`flex flex-row items-center gap-2 w-full text-left rounded-md p-2 transition-colors text-sm font-medium ${
                        disabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                      disabled={disabled}
                      title={
                        disabled ? 'Open or create a project first' : undefined
                      }
                    >
                      <div className="relative flex items-center gap-2">
                        {subItem.icon}
                        {disabled && (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      {subItem.title}
                    </button>
                  </NavigationMenuLink>
                </li>
              );
            })}
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  const disabled = !!item.page && item.page !== 'project' && !hasProject;
  return (
    <NavigationMenuItem key={item.title}>
      <NavigationMenuLink
        className={`${navigationMenuTriggerStyle()} ${currentPage === item.page ? 'bg-accent text-accent-foreground' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => item.page && handlePageChange(item.page)}
        title={disabled ? 'Open or create a project first' : undefined}
      >
        <div className="flex items-center gap-2 relative">
          {item.icon}
          {disabled && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          {item.title}
        </div>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
};

/**
 * Renders a menu item for the mobile navigation menu.
 *
 * @param item - The menu item to render
 * @param currentPage - The currently active page
 * @param handlePageChange - Function to handle page navigation
 * @returns JSX element representing the mobile menu item
 */
const renderMobileMenuItem = (
  item: MenuItem,
  currentPage: string,
  handlePageChange: (
    page: 'project' | 'explore' | 'build' | 'analytics',
  ) => void,
) => {
  if (item.items) {
    return (
      <AccordionItem key={item.title} value={item.title}>
        <AccordionTrigger className="text-muted-foreground hover:text-foreground">
          {item.title}
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2">
            {item.items.map((subItem) => (
              <div
                key={subItem.title}
                className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                onClick={() => subItem.page && handlePageChange(subItem.page)}
              >
                {subItem.icon}
                <span className="text-sm">{subItem.title}</span>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <div
      key={item.title}
      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
        currentPage === item.page
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      }`}
      onClick={() => item.page && handlePageChange(item.page)}
    >
      {item.icon}
      <span className="text-sm font-medium">{item.title}</span>
    </div>
  );
};

export { TopNavigationBar };
