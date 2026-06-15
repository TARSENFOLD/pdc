export default {
  routes: [
    {
      method: 'POST',
      path: '/inscricoes-programas/:id/transicao-conclusao',
      handler: 'inscricao-programa.transitionCompletion',
      config: {},
    },
  ],
};
