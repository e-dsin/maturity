// src/components/layout/Navigation.tsx - NAVIGATION RESPONSIVE ADAPTÉE AUX RÔLES
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Typography,
  Divider,
  Chip,
  Badge,
  Tooltip,
  IconButton,
  useTheme,
  useMediaQuery,
  Backdrop
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  Apps as AppsIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  AdminPanelSettings as AdminIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  NotificationsActive as NotificationsIcon,
  Close as CloseIcon
} from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { useEvaluationRedirect } from '../../hooks/useEvaluationRedirect';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavigationItem[];
  roles?: string[]; // Rôles autorisés
  accessLevels?: string[]; // Niveaux d'accès autorisés
  badge?: string | number;
  tooltip?: string;
  disabled?: boolean;
}

interface NavigationProps {
  open: boolean;
  onClose: () => void;
  drawerWidth: number;
}

const Navigation: React.FC<NavigationProps> = ({ open, onClose, drawerWidth }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { evaluationStatus, needsAttention } = useEvaluationRedirect();

  // États pour les sections expandables
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    analyses: true,
    evaluation: true,
    gestion: false,
    admin: false
  });

  /**
   * ✅ useEffect pour la gestion responsive des sections
   */
  useEffect(() => {
    if (isMobile) {
      // Sur mobile, fermer toutes les sections par défaut pour économiser l'espace
      setExpandedSections({
        analyses: false,
        evaluation: false,
        gestion: false,
        admin: false
      });
    } else {
      // Sur desktop, garder certaines sections ouvertes
      setExpandedSections(prev => ({
        ...prev,
        analyses: true,
        evaluation: true
      }));
    }
  }, [isMobile]);

  /**
   * Détermine le niveau d'accès de l'utilisateur
   */
  const userAccessLevel = useMemo(() => {
    if (!user?.nom_role) return 'NONE';
    
    const role = user.nom_role.toUpperCase();
    if (['CONSULTANT', 'ADMINISTRATEUR', 'SUPER-ADMINISTRATEUR'].includes(role)) {
      return 'GLOBAL';
    } else if (role === 'MANAGER') {
      return 'ENTREPRISE';
    } else if (role === 'INTERVENANT') {
      return 'PERSONNEL';
    }
    return 'LIMITED';
  }, [user?.nom_role]);

  /**
   * Configuration des éléments de navigation selon les rôles
   */
  const navigationItems: NavigationItem[] = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      roles: ['all'], // Accessible à tous
      tooltip: 'Vue d\'ensemble'
    },
    
    // === SECTION ÉVALUATIONS ===
    {
      id: 'evaluation',
      label: 'Évaluations',
      icon: <AssessmentIcon />,
      accessLevels: ['GLOBAL', 'ENTREPRISE', 'PERSONNEL'],
      badge: needsAttention ? '!' : undefined,
      children: [
        {
          id: 'evaluation-my',
          label: 'Mon Évaluation',
          icon: <PersonIcon />,
          path: '/evaluation/my',
          accessLevels: ['GLOBAL', 'ENTREPRISE', 'PERSONNEL'],
          badge: needsAttention ? '!' : undefined,
          tooltip: 'Votre évaluation personnelle'
        },
        {
          id: 'evaluation-enterprise',
          label: 'Évaluation Entreprise',
          icon: <BusinessIcon />,
          path: '/evaluation/enterprise',
          accessLevels: ['GLOBAL', 'ENTREPRISE'],
          tooltip: 'Évaluation de votre entreprise'
        },
        {
          id: 'evaluation-history',
          label: 'Historique',
          icon: <TrendingUpIcon />,
          path: '/evaluation/history',
          accessLevels: ['GLOBAL', 'ENTREPRISE'],
          tooltip: 'Historique des évaluations'
        }
      ]
    },

    // === SECTION ANALYSES ===
    {
      id: 'analyses',
      label: 'Analyses & Recommandations',
      icon: <TrendingUpIcon />,
      accessLevels: ['GLOBAL', 'ENTREPRISE', 'PERSONNEL'],
      children: [
        {
          id: 'analyses-enterprise',
          label: 'Vue Entreprise',
          icon: <BusinessIcon />,
          path: '/analyses-interpretations-entreprises',
          accessLevels: ['GLOBAL', 'ENTREPRISE'],
          tooltip: 'Analyses au niveau entreprise'
        },
        {
          id: 'analyses-functions',
          label: 'Vue par Fonctions',
          icon: <AppsIcon />,
          path: '/analyses-interpretations-functions',
          accessLevels: ['GLOBAL', 'ENTREPRISE', 'PERSONNEL'],
          tooltip: 'Analyses par fonction'
        },
        {
          id: 'calculate-score',
          label: 'Calcul de Score',
          icon: <AssessmentIcon />,
          path: '/calculate-score',
          accessLevels: ['GLOBAL', 'ENTREPRISE'],
          tooltip: 'Calculateur de score de maturité'
        }
      ]
    },

    // === SECTION GESTION ===
    {
      id: 'gestion',
      label: 'Gestion',
      icon: <SettingsIcon />,
      accessLevels: ['GLOBAL', 'ENTREPRISE'],
      children: [
        {
          id: 'questionnaires',
          label: 'Questionnaires',
          icon: <QuizIcon />,
          path: '/questionnaires',
          accessLevels: ['GLOBAL', 'ENTREPRISE'],
          tooltip: 'Gestion des questionnaires'
        },
        {
          id: 'formulaires',
          label: 'Formulaires',
          icon: <AssignmentIcon />,
          path: '/forms',
          accessLevels: ['GLOBAL', 'ENTREPRISE'],
          tooltip: 'Gestion des formulaires'
        },
        {
          id: 'applications',
          label: 'Applications',
          icon: <AppsIcon />,
          path: '/applications',
          accessLevels: ['GLOBAL', 'ENTREPRISE'],
          tooltip: 'Gestion des applications'
        },
        {
          id: 'organisations',
          label: 'Organisations',
          icon: <PublicIcon />,
          path: '/organisations',
          accessLevels: ['GLOBAL'],
          tooltip: 'Gestion des organisations'
        },
        {
          id: 'users',
          label: 'Utilisateurs',
          icon: <PeopleIcon />,
          path: '/acteurs',
          accessLevels: ['GLOBAL', 'ENTREPRISE'],
          tooltip: 'Gestion des utilisateurs'
        }
      ]
    },

    // === SECTION ADMINISTRATION ===
    {
      id: 'admin',
      label: 'Administration',
      icon: <AdminIcon />,
      roles: ['SUPER-ADMINISTRATEUR', 'ADMINISTRATEUR'],
      children: [
        {
          id: 'roles',
          label: 'Rôles',
          icon: <GroupIcon />,
          path: '/administration/roles',
          roles: ['SUPER-ADMINISTRATEUR', 'ADMINISTRATEUR'],
          tooltip: 'Gestion des rôles'
        },
        {
          id: 'permissions',
          label: 'Permissions',
          icon: <LockIcon />,
          path: '/administration/permissions',
          roles: ['SUPER-ADMINISTRATEUR', 'ADMINISTRATEUR'],
          tooltip: 'Gestion des permissions'
        },
        {
          id: 'system',
          label: 'Système',
          icon: <SettingsIcon />,
          path: '/administration/system',
          roles: ['SUPER-ADMINISTRATEUR'],
          tooltip: 'Configuration système'
        }
      ]
    }
  ], [user, evaluationStatus, needsAttention, userAccessLevel]);

  /**
   * Vérifie si l'utilisateur peut accéder à un élément
   */
  const canAccessItem = (item: NavigationItem): boolean => {
    // Vérification par rôles spécifiques
    if (item.roles) {
      if (item.roles.includes('all')) return true;
      if (!user?.nom_role) return false;
      return item.roles.includes(user.nom_role.toUpperCase());
    }

    // Vérification par niveaux d'accès
    if (item.accessLevels) {
      return item.accessLevels.includes(userAccessLevel);
    }

    // Par défaut, accessible
    return true;
  };

  /**
   * Filtre les éléments selon les permissions
   */
  const filteredNavigationItems = useMemo(() => {
    const filterItems = (items: NavigationItem[]): NavigationItem[] => {
      return items
        .filter(canAccessItem)
        .map(item => ({
          ...item,
          children: item.children ? filterItems(item.children) : undefined
        }))
        .filter(item => !item.children || item.children.length > 0);
    };

    return filterItems(navigationItems);
  }, [navigationItems, userAccessLevel, user?.nom_role]);

  /**
   * ✅ Gestion de la navigation avec fermeture auto sur mobile
   */
  const handleNavigation = (path: string) => {
    navigate(path);
    // Fermer automatiquement sur mobile
    if (isMobile && onClose) {
      onClose();
    }
  };

  /**
   * Gestion de l'expansion des sections
   */
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  /**
   * Détermine si une route est active
   */
  const isActiveRoute = (path: string): boolean => {
    if (path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')) return true;
    return location.pathname.startsWith(path);
  };

  /**
   * Rendu d'un élément de navigation
   */
  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections[item.id];
    const isActive = item.path ? isActiveRoute(item.path) : false;

    if (hasChildren) {
      return (
        <React.Fragment key={item.id}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => toggleSection(item.id)}
              sx={{
                pl: 2 + level * 2,
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                minHeight: isMobile ? 44 : 48, // ✅ Hauteur adaptée mobile
              }}
            >
              <ListItemIcon sx={{ minWidth: isMobile ? 36 : 40 }}> {/* ✅ Icônes plus petites sur mobile */}
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                primaryTypographyProps={{
                  variant: level === 0 ? (isMobile ? 'body2' : 'subtitle2') : 'body2', // ✅ Texte adapté mobile
                  fontWeight: level === 0 ? 600 : 400,
                  fontSize: isMobile ? '0.875rem' : undefined // ✅ Taille de police mobile
                }}
              />
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map(child => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    // ✅ Wrapper conditionnel pour Tooltip (fix erreur React)
    const ButtonContent = (
      <ListItemButton
        onClick={() => item.path && handleNavigation(item.path)}
        disabled={item.disabled}
        sx={{
          pl: 2 + level * 2,
          borderRadius: 1,
          mx: 1,
          mb: 0.5,
          minHeight: isMobile ? 44 : 48,
          backgroundColor: isActive ? 'primary.light' : 'transparent',
          color: isActive ? 'primary.contrastText' : 'inherit',
          '&:hover': {
            backgroundColor: isActive ? 'primary.main' : 'action.hover'
          }
        }}
      >
        <ListItemIcon sx={{ 
          minWidth: isMobile ? 36 : 40,
          color: isActive ? 'primary.contrastText' : 'inherit'
        }}>
          {item.badge ? (
            <Badge 
              badgeContent={item.badge} 
              color={typeof item.badge === 'string' ? 'error' : 'primary'}
            >
              {item.icon}
            </Badge>
          ) : (
            item.icon
          )}
        </ListItemIcon>
        <ListItemText 
          primary={item.label}
          primaryTypographyProps={{
            variant: level === 0 ? (isMobile ? 'body2' : 'subtitle2') : 'body2',
            fontWeight: isActive ? 600 : (level === 0 ? 600 : 400),
            fontSize: isMobile ? '0.875rem' : undefined
          }}
        />
      </ListItemButton>
    );

    return (
      <ListItem key={item.id} disablePadding>
        {!isMobile && item.tooltip ? (
          <Tooltip title={item.tooltip} placement="right">
            {ButtonContent}
          </Tooltip>
        ) : (
          ButtonContent
        )}
      </ListItem>
    );
  };

  /**
   * ✅ Contenu du drawer
   */
  const drawerContent = (
    <>
      {/* En-tête du drawer */}
      <Box sx={{ 
        p: isMobile ? 1.5 : 2, // ✅ Padding réduit sur mobile
        backgroundColor: 'primary.main', 
        color: 'primary.contrastText',
        position: 'relative'
      }}>
        {/* Bouton de fermeture sur mobile */}
        {isMobile && (
          <IconButton
            onClick={onClose}
            sx={{ 
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'primary.contrastText'
            }}
          >
            <CloseIcon />
          </IconButton>
        )}

        <Typography variant={isMobile ? 'subtitle1' : 'h6'} noWrap component="div">
          {isMobile ? 'Platform' : 'Maturité Platform'} {/* ✅ Titre court sur mobile */}
        </Typography>
        
        {!isMobile && ( // ✅ Informations utilisateur masquées sur mobile
          <>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {user?.nom_prenom}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={1}>
              <Chip 
                label={user?.nom_role || 'Utilisateur'} 
                size="small" 
                sx={{ 
                  backgroundColor: 'primary.dark',
                  color: 'primary.contrastText',
                  fontSize: '0.75rem'
                }}
              />
              <Chip 
                label={userAccessLevel} 
                size="small" 
                variant="outlined"
                sx={{ 
                  borderColor: 'primary.contrastText',
                  color: 'primary.contrastText',
                  fontSize: '0.75rem'
                }}
              />
            </Box>
          </>
        )}
      </Box>

      {/* Alerte d'évaluation si nécessaire */}
      {needsAttention && evaluationStatus && !isMobile && ( // ✅ Masqué sur mobile pour économiser l'espace
        <Box sx={{ p: 2, backgroundColor: 'warning.light' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <NotificationsIcon color="warning" />
            <Typography variant="body2" fontWeight="medium">
              Action requise
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {evaluationStatus.message}
          </Typography>
        </Box>
      )}

      <Divider />

      {/* Navigation principale */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List sx={{ pt: 1 }}>
          {filteredNavigationItems.map(item => renderNavigationItem(item))}
        </List>
      </Box>

      {/* Informations en bas */}
      {!isMobile && ( // ✅ Informations masquées sur mobile
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {user?.nom_entreprise && (
                <>Entreprise: {user.nom_entreprise}<br /></>
              )}
              Niveau d'accès: {userAccessLevel}
            </Typography>
          </Box>
        </>
      )}
    </>
  );

  return (
    <>
      {/* ✅ Backdrop pour mobile - ferme le drawer en cliquant à côté */}
      {isMobile && open && (
        <Backdrop
          open={open}
          onClick={onClose}
          sx={{ 
            zIndex: theme.zIndex.drawer - 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
        />
      )}

      {/* ✅ Drawer avec variant adaptatif */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'} // ✅ Variant adaptatif
        anchor="left"
        open={open}
        onClose={isMobile ? onClose : undefined} // ✅ onClose seulement sur mobile
        ModalProps={{
          keepMounted: true, // ✅ Meilleure performance mobile
        }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
            // ✅ Z-index adaptatif
            zIndex: isMobile ? theme.zIndex.drawer + 1 : theme.zIndex.drawer
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Navigation;