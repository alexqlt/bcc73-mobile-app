// Web : on utilise le localStorage du navigateur. Il est absent pendant le rendu statique
// (côté serveur) : la session n'est alors pas persistée.
export const sessionStorage = typeof localStorage === 'undefined' ? undefined : localStorage;
