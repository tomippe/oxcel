import './App.css'
import { Grid } from './components/Grid'
import oxcelLogo from '/oxcel-logo.svg'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <img src={oxcelLogo} alt="Oxcel" className="app-logo" />
      </header>
      <main className="app-main">
        <Grid />
      </main>
      <footer className="app-footer">
        <a href="https://apps.tomippe.jp/" target="_blank" rel="noopener noreferrer">
          <img src="https://tomippe.jp/img/apps-logo.svg" alt="Studio tomippe APPS" className="tomippe-logo" />
        </a>
      </footer>
    </div>
  )
}

export default App
