import React from 'react'
import ReactDOMServer from 'react-dom/server'
import App from './App'
import Page2 from './Page2'

export function render(url: string, context: any) {
  if (url !== '/') {
    return ReactDOMServer.renderToString(<Page2 />)
  }
  return ReactDOMServer.renderToString(<App />)
}
