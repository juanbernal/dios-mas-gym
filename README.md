
# Dios Mas Gym - App Oficial 🛡️💪

Esta aplicación utiliza **Blogger API v3** para el contenido, protegida mediante variables de entorno.

## 🔒 Cómo ocultar tu API Key en GitHub (Nivel Pro)

Para que **NADIE** vea tu API Key ni tu Blog ID en el código de GitHub, sigue estos pasos:

### 1. Configura GitHub Secrets
1. Ve a tu repositorio en GitHub.
2. Haz clic en **Settings** -> **Secrets and variables** -> **Actions**.
3. Haz clic en **New repository secret** y añade:
   - Name: `BLOGGER_API_KEY` | Value: (Tu clave real)
   - Name: `BLOGGER_BLOG_ID` | Value: `5031959192789589903`

### 2. Configura el Workflow de Despliegue (GitHub Actions)
Si usas un build tool (como Vite o Webpack), asegúrate de que tu archivo de "workflow" (.yml) inyecte estas variables durante el build:

```yaml
- name: Build
  run: npm run build
  env:
    BLOGGER_API_KEY: ${{ secrets.BLOGGER_API_KEY }}
    BLOGGER_BLOG_ID: ${{ secrets.BLOGGER_BLOG_ID }}
```

## 🛡️ Seguridad Adicional (Restricción de HTTP)
Aunque uses Secrets, la clave viaja al navegador. Es **OBLIGATORIO** hacer esto en Google Cloud Console:
1. Ve a [API & Services > Credentials](https://console.cloud.google.com/apis/credentials).
2. Edita tu API Key.
3. En **Set an application restriction**, elige **Websites**.
4. Añade tu URL de GitHub Pages: `https://tu-usuario.github.io/*`.
5. **Esto es lo que realmente protege tu bolsillo**: Ahora, aunque alguien robe tu clave, Google solo aceptará peticiones que vengan de TU SITIO.

## 🛠️ Tecnologías
- **React 19**
- **Tailwind CSS Premium**
- **Blogger API v3 (Encapsulada)**
