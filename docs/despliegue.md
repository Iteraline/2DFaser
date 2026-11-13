# Despliegue

- **Vercel**: proyecto `2dfaser` en el equipo «Luis Paredes' projects», con Root Directory `web`, framework Other y sin compilación. Vercel Authentication desactivada para poder instalar la PWA.
- Cada push a `main` despliega solo si el repo queda conectado a Vercel. Si no, se despliega a mano desde Claude (`create_deployment` con `gitSource` Iteraline/2DFaser, rama `main`, target `production`) o con el flujo de GitHub Actions. Para el flujo hacen falta el secreto `VERCEL_TOKEN` y las variables `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`.
- Sin funciones `/api` ni variables de entorno.
