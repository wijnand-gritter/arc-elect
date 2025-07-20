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
  Settings,
} from 'lucide-react';
import { ArcElectLogo } from './ui/arc-elect-logo';

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
} from './ui/navigation-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';

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
  page?: 'project' | 'explore' | 'build' | 'settings';
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
  const handlePageChange = (page: 'project' | 'explore' | 'build' | 'settings') => {
    setPage(page);
  };

  return (
    <section className="py-4 border-b border-border/40">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Desktop Menu */}
        <nav className="hidden justify-between md:flex">
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
                  {menu.map((item) => renderMenuItem(item, currentPage, handlePageChange))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Search className="h-4 w-4" />
              <span className="sr-only">Search</span>
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handlePageChange('settings')}
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <div className="flex items-center justify-between md:hidden">
          <button
            onClick={handleLogoClick}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <ArcElectLogo className="h-8 w-auto" />
          </button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <Accordion type="single" collapsible className="w-full">
                  {menu.map((item) => renderMobileMenuItem(item, currentPage, handlePageChange))}
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
  handlePageChange: (page: 'project' | 'explore' | 'build' | 'settings') => void,
) => {
  if (item.items) {
    return (
      <NavigationMenuItem key={item.title}>
        <NavigationMenuTrigger className="text-muted-foreground hover:text-foreground">
          {item.title}
        </NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-[.75fr_1fr] lg:w-[600px]">
            {item.items.map((subItem) => (
              <li key={subItem.title}>
                <SubMenuLink item={subItem} />
              </li>
            ))}
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem key={item.title}>
      <NavigationMenuLink
        className={`block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${currentPage === item.page
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground'
          }`}
        onClick={() => item.page && handlePageChange(item.page)}
      >
        <div className="flex items-center gap-2">
          {item.icon}
          <div className="text-sm font-medium leading-none">{item.title}</div>
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
  handlePageChange: (page: 'project' | 'explore' | 'build' | 'settings') => void,
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
                className="flex items-center gap-2 p-2 hover:bg-accent rounded-md"
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
      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${currentPage === item.page
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

/**
 * Renders a submenu link for dropdown menus.
 *
 * @param props - Component props
 * @param props.item - The submenu item to render
 * @returns JSX element representing the submenu link
 */
const SubMenuLink = ({ item }: { item: MenuItem }) => {
  return (
    <NavigationMenuLink asChild>
      <a
        href={item.url}
        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
      >
        <div className="flex items-center gap-2">
          {item.icon}
          <div className="text-sm font-medium leading-none">{item.title}</div>
        </div>
        {item.description && (
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {item.description}
          </p>
        )}
      </a>
    </NavigationMenuLink>
  );
};

export { TopNavigationBar };
