const fs = require('fs')
const path = require('path')
const express = require('express')

const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITE_TEST_BUILD

async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === 'production',
) {
  const resolve = p => path.resolve(__dirname, p)
  const indexProd = isProd ? fs.readFileSync(resolve('dist/client/index.html', 'utf-8')) : ''
  const page2Prod = isProd ? fs.readFileSync(resolve('dist/client/page2.html', 'utf-8')) : ''
  const app = express()

  /**
   * @type {import('vite').ViteDevServer}
   */
  let vite
  if (!isProd) {
    vite = await require('vite').createServer({
      root,
      logLevel: isTest ? 'error' : 'info',
      server: { middlewareMode: true }
    })
    // use vite's connect instance as middleware
    app.use(vite.middlewares)
  } else {
    app.use(require('compression')())
    app.use(
      require('serve-static')(resolve('dist/client'), {
        index: false,
      })
    )
  }

  app.use('*', async (req, res) => {
    const url = req.originalUrl
    const isIndexPage = url === '/'
    const htmlFile = isIndexPage ? 'index.html' : 'page2.html'

    let template, render
    try {
      if (!isProd) {
        template = fs.readFileSync(
          path.resolve(__dirname, htmlFile),
          'utf-8'
        )
        template = await vite.transformIndexHtml(url, template)
        const entry = await (vite.ssrLoadModule('/src/entry-server.tsx'))
        render = entry.render
      } else {
        template = isIndexPage ? indexProd : page2Prod
        render = require('./dist/server/entry-server.js').render
      }

      // 4. render the app HTML. This assumes entry-server.js's exported `render`
      //    function calls appropriate framework SSR APIs,
      //    e.g. ReactDOMServer.renderToString()
      const appHtml = await render(url)

      // 5. Inject the app-rendered HTML into the template.
      const html = template.replace('<!--ssr-outlet-->', appHtml)

      // 6. Send the rendered HTML back.
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)

    } catch(e) {
      // If an error is caught, let vite fix the stracktrace so it maps back to
      // your actual source code
      vite.ssrFixStacktrace(e)
      console.error(e)
      res.status(500).end(e.message)
    }
  })

  return app
}

createServer().then((app) => {
  app.listen(3000, () => {
    console.log('App listening at http://localhost:3000')
  })
})
