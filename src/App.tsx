import { useEffect, useState } from 'react'
import { api, setToken } from './lib/api'

type Branch = { id: number; name: string; code?: string }

export default function App() {
  const [email, setEmail] = useState('admin@agronare.mx')
  const [password, setPassword] = useState('admin123')
  const [user, setUser] = useState<any>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function login(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setToken(data.access_token)
      setUser(data.user)
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // intenta cargar sucursales
      api('/branches')
        .then(setBranches)
        .catch(() => {})
    }
  }, [user])

  if (!localStorage.getItem('token')) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <form onSubmit={login} className="w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-4">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold">Agronare — Acceso</h1>
            <p className="text-sm text-gray-500">Usa las credenciales del administrador sembradas por el backend.</p>
          </header>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Correo</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-brand-600" placeholder="correo@agronare.mx" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Contraseña</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-brand-600" placeholder="********" />
          </div>
          <button disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 font-semibold">
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
          <p className="text-xs text-gray-500">Default: admin@agronare.mx / admin123</p>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-extrabold text-brand-700">Agronare</div>
          <div className="text-sm text-gray-600">Hola, {user?.name}</div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        <section className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-bold mb-2">Sucursales</h2>
            <p className="text-sm text-gray-500 mb-4">Lista obtenida del backend NestJS.</p>
            <ul className="space-y-2">
              {branches.map(b => (
                <li key={b.id} className="p-3 rounded-lg border">{b.name} {b.code ? <span className="text-xs text-gray-500">({b.code})</span> : null}</li>
              ))}
            </ul>
            {!branches.length && <p className="text-sm text-gray-500">No hay sucursales (¿ya corriste el seed?).</p>}
          </div>

          <QuickCreateProduct />
        </section>
      </main>
    </div>
  )
}

function QuickCreateProduct() {
  const [form, setForm] = useState({ name: '', sku: '', unit: 'PIEZA', price: '0', cost: '0' })
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null); setErr(null)
    try {
      const data = await api('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          unit: form.unit,
          price: Number(form.price),
          cost: Number(form.cost),
        })
      })
      setMsg(`Producto creado: ${data.name}`)
      setForm({ name: '', sku: '', unit: 'PIEZA', price: '0', cost: '0' })
    } catch (e: any) {
      setErr(e.message || 'Error al crear producto')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-bold mb-2">Alta rápida de producto</h2>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <input required placeholder="Nombre" className="border rounded-lg px-3 py-2 col-span-2" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
        <input required placeholder="SKU" className="border rounded-lg px-3 py-2" value={form.sku} onChange={e=>setForm({...form, sku: e.target.value})} />
        <select className="border rounded-lg px-3 py-2" value={form.unit} onChange={e=>setForm({...form, unit: e.target.value})}>
          <option value="PIEZA">Pieza</option>
          <option value="KG">Kg</option>
          <option value="LITRO">Litro</option>
          <option value="SACA">Saca</option>
        </select>
        <input required type="number" step="0.01" placeholder="Precio" className="border rounded-lg px-3 py-2" value={form.price} onChange={e=>setForm({...form, price: e.target.value})} />
        <input required type="number" step="0.01" placeholder="Costo" className="border rounded-lg px-3 py-2" value={form.cost} onChange={e=>setForm({...form, cost: e.target.value})} />
        <button className="col-span-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 font-semibold">Guardar</button>
      </form>
      {msg && <p className="text-sm text-green-700 mt-3">{msg}</p>}
      {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
    </div>
  )
}
