import './globals.css'

export const metadata = {
  title: 'Tic Tac Toe',
  description: 'A simple Tic Tac Toe app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: 900, margin: '24px auto' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h1 style={{ margin: 0 }}>Tic Tac Toe</h1>
            <nav>
              <a href="/" style={{ marginRight: 12 }}>Home</a>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
