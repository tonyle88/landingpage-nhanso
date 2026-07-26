import { createServer } from "node:http";

const server = createServer((request, response) => {
  response.writeHead(302, {
    Location: "http://127.0.0.1:3100/admin/set-password",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  });
  response.end();
});

server.listen(3000, "127.0.0.1", () => {
  console.log("Local Auth redirect ready on 127.0.0.1:3000");
});
