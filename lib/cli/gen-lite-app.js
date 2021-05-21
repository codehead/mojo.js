import * as util from './../util.js';

export default async function genLiteAppCommand (app, args) {
  process.stdout.write('Generating single file application:\n');
  await util.cliCreateFile(args[1] ?? 'index.js', liteApp, {}, {chmod: 0o744});
  await util.cliFixPackage();
}

genLiteAppCommand.description = 'Generate single file application';
genLiteAppCommand.usage = `Usage: APPLICATION gen-lite-app [OPTIONS] [NAME]

  node index.js gen-lite-app
  node index.js gen-lite-app myapp.js

Options:
  -h, --help   Show this summary of available options
`;

const liteApp = `#!/usr/bin/env node
import mojo from '@mojojs/mojo';

const app = mojo();

app.any('/', async ctx => {
  await ctx.render({inline: indexTemplate, inlineLayout: defaultLayout}, {title: 'Welcome'});
});

app.start();

const indexTemplate = \`
<h1>Welcome to the mojo.js real-time web framework!</h1>
\`;

const defaultLayout = \`
<!DOCTYPE html>
<html>
  <head>
    <title><%%= title %%></title>
  </head>
  <body><%%- view.content %%></body>
</html>
\`;
`;