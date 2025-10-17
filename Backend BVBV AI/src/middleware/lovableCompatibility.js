/**
 * Middleware para compatibilidade com o frontend do Lovable
 * Garante que todas as respostas sigam o formato esperado
 */
const lovableCompatibility = (req, res, next) => {
  // Formato padrão de resposta de sucesso
  res.success = (data, message = 'Operação realizada com sucesso', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  };

  // Formato padrão de erro
  res.error = (message = 'Ocorreu um erro', statusCode = 500, errors = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      errors: errors || {},
      statusCode
    });
  };

  // Middleware para padronizar os parâmetros de paginação
  req.getPagination = () => ({
    page: parseInt(req.query.page, 10) || 1,
    limit: Math.min(parseInt(req.query.limit, 10) || 20, 100),
    sort: req.query.sort || '-createdAt'
  });

  next();
};

module.exports = lovableCompatibility;
