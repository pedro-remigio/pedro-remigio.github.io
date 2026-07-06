// Encaminha erros de handlers assíncronos pro middleware de erro do Express.
// Sem isso, uma falha no banco (ou qualquer exceção async) vira uma promise
// rejeitada sem tratamento, que trava a requisição e pode derrubar o processo
// inteiro do Node, afetando todo mundo que estiver usando o servidor.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
