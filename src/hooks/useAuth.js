// Création d'un hook fictif useAuth pour le développement si non défini
// À remplacer par l'implémentation réelle
export const useAuth = () => {
    // Version simplifiée pour le développement
    return {
      isAuthenticated: true,
      user: { id: 'dev-user', role: 'admin' },
      login: () => Promise.resolve(true),
      logout: () => {},
      error: null
    };
  };