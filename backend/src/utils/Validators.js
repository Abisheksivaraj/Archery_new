const validateEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

const validateEmpId = (empId) => {
  const empIdRegex = /^[A-Z]{3}\d{3}$/;
  return empIdRegex.test(empId);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateUserRights = (userRights) => {
  const validModules = [
    "partMaster",
    "dispatch",
    "scanner",
    "reports",
    "admin",
  ];
  const validPermissions = ["access", "denied"];

  if (!userRights || typeof userRights !== "object") {
    return false;
  }

  for (const module in userRights) {
    if (!validModules.includes(module)) {
      return false;
    }
    if (!validPermissions.includes(userRights[module])) {
      return false;
    }
  }

  return true;
};

module.exports = {
  validateEmail,
  validateEmpId,
  validatePassword,
  validateUserRights,
};
