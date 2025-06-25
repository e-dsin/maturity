import React, { useState } from 'react';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  Typography, 
  Divider, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  CssBaseline,
  useTheme,
  useMediaQuery,
  Collapse,
  Badge,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Computer as ComputerIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  BusinessCenter as BusinessIcon,
  QuestionAnswer as QuestionIcon,
  ChevronLeft as ChevronLeftIcon,
  Assignment as AssignmentIcon,
  AdminPanelSettings as AdminIcon,
  ExpandLess,
  ExpandMore,
  Security as SecurityIcon,
  AccountCircle as RoleIcon,
  Settings as SettingsIcon,
  ModelTraining as MaturityIcon,
  Logout as LogoutIcon,
  Business as OrganizationIcon
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 280; // Largeur augmentée pour les sous-menus

// Configuration des éléments de menu avec permissions
interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path?: string;
  module?: string;
  action?: string;
  subItems?: MenuItem[];
  adminOnly?: boolean;
  divider?: boolean;
}

const MainLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    currentUser, 
    hasPermission, 
    canAccessRoute, 
    canAccessAdminModule,
    isAdmin,
    isSuperAdmin,
    logout,
    getAdminSubModules
  } = useAuth();

  // Configuration des éléments de menu avec la nouvelle structure
  const menuItems: MenuItem[] = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
      module: 'DASHBOARD',
      action: 'voir'
    },
    {
      text: 'Analyses & Recommandations',
      icon: <AssessmentIcon />,
      path: '/analyses-fonctions',
      module: 'ANALYSES',
      action: 'voir'
    },
    {
      text: 'Formulaires',
      icon: <AssignmentIcon />,
      path: '/formulaires',
      module: 'FORMULAIRES',
      action: 'voir'
    },
    {
      text: 'Questionnaires',
      icon: <QuestionIcon />,
      path: '/questionnaires',
      module: 'QUESTIONNAIRES',
      action: 'voir'
    },
      
    // Divider avant administration
    {
      text: '',
      icon: <></>,
      divider: true
    },
    // === MODULE D'ADMINISTRATION UNIFIÉ ===
    {
      text: 'Administration',
      icon: <AdminIcon />,
      module: 'ADMINISTRATION',
      action: 'voir',
      adminOnly: true,
      subItems: [
        {
          text: 'Gestion des Utilisateurs',
          icon: <PeopleIcon />,
          path: '/admin',
          module: 'ADMIN_USERS',
          action: 'voir'
        },
        {
          text: 'Permissions & Rôles',
          icon: <SecurityIcon />,
          path: '/admin',
          module: 'ADMIN_PERMISSIONS',
          action: 'voir'
        },
        {
          text: 'Entreprises',
          icon: <BusinessIcon />,
          path: '/admin',
          module: 'ADMINISTRATION',
          action: 'voir'
        },
        {
          text: 'Modèle de Maturité',
          icon: <MaturityIcon />,
          path: '/admin/maturity-model',
          module: 'ADMIN_MATURITY',
          action: 'voir'
        },
        {
          text: 'Configuration Système',
          icon: <SettingsIcon />,
          path: '/admin/system',
          module: 'ADMIN_SYSTEM',
          action: 'voir'
        }
      ]
    }
  ];

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setOpen(false);
    }
  };

  const handleAdminMenuToggle = () => {
    setAdminMenuOpen(!adminMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Fonction pour vérifier si un élément de menu est accessible
  const isMenuItemAccessible = (item: MenuItem): boolean => {
    // Si l'item est marqué admin seulement et l'utilisateur n'est pas admin
    if (item.adminOnly && !isAdmin() && !isSuperAdmin()) {
      return false;
    }

    // Si l'item a un module et une action spécifiés
    if (item.module && item.action) {
      return hasPermission(item.module, item.action);
    }

    // Si l'item a un path, vérifier l'accès via la route
    if (item.path) {
      return canAccessRoute(item.path);
    }

    return true;
  };

  // Fonction pour vérifier si un élément de menu est actif
  const isMenuItemActive = (item: MenuItem): boolean => {
    if (item.path) {
      // Pour les items d'administration, considérer comme actif si on est sur /admin
      if (item.path === '/admin' && location.pathname.startsWith('/admin')) {
        return true;
      }
      return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    }
    return false;
  };

  // Fonction pour vérifier si le menu admin contient des éléments actifs
  const isAdminMenuActive = (): boolean => {
    return location.pathname.startsWith('/admin');
  };

  // Fonction pour rendre un élément de menu
  const renderMenuItem = (item: MenuItem, isSubItem = false) => {
    if (item.divider) {
      return <Divider key="divider" sx={{ my: 1 }} />;
    }

    if (!isMenuItemAccessible(item)) {
      return null;
    }

    const isActive = isMenuItemActive(item);
    const hasSubItems = item.subItems && item.subItems.length > 0;

    return (
      <ListItem key={item.text} disablePadding sx={{ pl: isSubItem ? 4 : 0 }}>
        <ListItemButton 
          selected={isActive}
          onClick={() => {
            if (hasSubItems && item.text === 'Administration') {
              handleAdminMenuToggle();
            } else if (item.path) {
              handleNavigate(item.path);
            }
          }}
          sx={{
            borderRadius: 1,
            mx: 1,
            mb: 0.5,
            ...(isActive && {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '& .MuiListItemIcon-root': {
                color: 'primary.contrastText',
              }
            })
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText 
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: isActive ? 600 : 400 }}>
                  {item.text}
                </Typography>
                {item.adminOnly && (
                  <Chip 
                    label="Admin" 
                    size="small" 
                    color="secondary" 
                    sx={{ 
                      height: 20, 
                      fontSize: '0.7rem',
                      ...(isActive && {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'inherit'
                      })
                    }} 
                  />
                )}
                {hasSubItems && (
                  adminMenuOpen ? <ExpandLess /> : <ExpandMore />
                )}
              </Box>
            }
          />
        </ListItemButton>
      </ListItem>
    );
  };

  // Fonction pour rendre les sous-éléments d'administration
  const renderAdminSubItems = () => {
    const adminItem = menuItems.find(item => item.text === 'Administration');
    if (!adminItem || !adminItem.subItems) return null;

    return (
      <Collapse in={adminMenuOpen} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {adminItem.subItems.map(subItem => {
            if (!isMenuItemAccessible(subItem)) return null;
            
            const isActive = isMenuItemActive(subItem);
            
            return (
              <ListItem key={subItem.text} disablePadding sx={{ pl: 2 }}>
                <ListItemButton 
                  selected={isActive}
                  onClick={() => subItem.path && handleNavigate(subItem.path)}
                  sx={{
                    borderRadius: 1,
                    mx: 1,
                    mb: 0.5,
                    backgroundColor: isActive ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, ml: 2 }}>
                    {subItem.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: isActive ? 600 : 400 }}>
                        {subItem.text}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Collapse>
    );
  };

  // Auto-ouvrir le menu admin si on est sur une page d'administration
  React.useEffect(() => {
    if (isAdminMenuActive()) {
      setAdminMenuOpen(true);
    }
  }, [location.pathname]);

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          width: { sm: open ? `calc(100% - ${drawerWidth}px)` : '100%' },
          ml: { sm: open ? `${drawerWidth}px` : 0 },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Plateforme d'Évaluation de Maturité - DSIN
          </Typography>
          
          {/* Informations utilisateur et déconnexion */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {currentUser?.nom_prenom}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {currentUser?.nom_role || currentUser?.role} - {currentUser?.organisation}
              </Typography>
            </Box>
            
            {(isAdmin() || isSuperAdmin()) && (
              <Badge color="secondary" variant="dot">
                <AdminIcon />
              </Badge>
            )}
            
            <IconButton
              color="inherit"
              onClick={handleLogout}
              title="Déconnexion"
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            ...(isMobile && {
              boxShadow: theme.shadows[8]
            })
          },
        }}
      >
        <Toolbar 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            px: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img 
              src="/logo_qwanza.svg" 
              alt="Logo" 
              style={{ height: 32, width: 'auto' }}
            />
           </Box>
          <IconButton onClick={handleDrawerToggle}>
            <ChevronLeftIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        
        <Box sx={{ overflow: 'auto', flex: 1 }}>
          <List component="nav" sx={{ px: 1, py: 2 }}>
            {menuItems.map((item) => {
              if (item.text === 'Administration') {
                // Traitement spécial pour le menu administration
                return (
                  <React.Fragment key="administration">
                    {renderMenuItem(item)}
                    {renderAdminSubItems()}
                  </React.Fragment>
                );
              }
              return renderMenuItem(item);
            })}
          </List>
        </Box>

        {/* Footer du drawer avec informations utilisateur */}
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Connecté en tant que:
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {currentUser?.nom_prenom}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {currentUser?.nom_role || currentUser?.role}
            {(isAdmin() || isSuperAdmin()) && (
              <Chip 
                label="Admin" 
                size="small" 
                color="primary" 
                sx={{ ml: 1, height: 16, fontSize: '0.7rem' }} 
              />
            )}
          </Typography>
        </Box>
      </Drawer>
      
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3,
          width: { sm: `calc(100% - ${open ? drawerWidth : 0}px)` },
          ml: { sm: open ? `${drawerWidth}px` : 0 },
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar /> {/* This creates space for the AppBar */}
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;