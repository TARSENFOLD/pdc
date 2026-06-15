export default {
  routes: [
    {
      method: 'POST',
      path: '/notificacoes/marcar-todas-lidas',
      handler: 'notificacao.markAllRead',
      config: {},
    },
  ],
};
