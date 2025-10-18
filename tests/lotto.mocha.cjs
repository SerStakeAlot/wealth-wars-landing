require("ts-node").register({ transpileOnly: true });

module.exports = {
  require: ["ts-node/register/transpile-only"],
};