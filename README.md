 # Libro-Accionistas

Aplicación web para gestionar el libro de accionistas de **Inmobiliaria SA**, construida con:

- Next.js (App Router)
- HeroUI (componentes de UI)
- Supabase (base de datos y backend as a service)

## Desarrollo

Instalar dependencias:

```bash
npm install
```

Servidor de desarrollo:

```bash
npm run dev
```

La aplicación se sirve por defecto en `http://localhost:3000`.

## Entorno (Supabase)

Crear un archivo `.env.local` en la raíz del proyecto con:

```bash
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

Luego reinicia el servidor de desarrollo.
