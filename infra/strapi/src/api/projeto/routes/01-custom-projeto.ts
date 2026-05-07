export default {
  routes: [
    {
      method: "POST",
      path: "/projetos/:id/solicitar-acesso",
      handler: "projeto.solicitarAcesso",
    }
  ]
};
