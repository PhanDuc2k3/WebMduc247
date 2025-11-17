const generator = require("mongoose-erd-generator");
const path = require("path");

generator({
  files: path.resolve(__dirname, "./models"), // thư mục chứa schema
  outFile: path.resolve(__dirname, "./erd/output.png"),
});
