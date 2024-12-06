import { ServerRequest, Response } from '@stackpress/ingest';

export default function Error(req: ServerRequest, res: Response) {
  console.log(req.method, req.url.pathname, res.toStatusResponse())
  const html = [ `<h1>${res.error}</h1>` ];
  const stack = res.stack?.map((log, i) => {
    const { line, char } = log;
    const method = log.method.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const file = log.file.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `#${i + 1} ${method} - ${file}:${line}:${char}`;
  }) || [];
  html.push(`<pre>${stack.join('<br><br>')}</pre>`);

  res.setHTML(html.join('<br>'));
};