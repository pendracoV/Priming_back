# PRIMING - Plataforma de Aprendizaje de Inglés para Niños

PRIMING es una aplicación web diseñada para facilitar el aprendizaje de inglés en niños de 5 a 7 años, enfocándose en el reconocimiento de cognados y pares mínimos para mejorar la comprensión auditiva y pronunciación.

## Características Principales

- **Juegos educativos**: Dos módulos principales (Cognados y Pares Mínimos) con múltiples niveles de dificultad
- **Sistema de evaluación**: Los evaluadores (docentes, estudiantes, egresados) pueden asignar niños y realizar seguimiento
- **Perfil personalizado**: Cada niño tiene su propio perfil con progreso y estadísticas
- **Panel administrativo**: Gestión completa de usuarios y encuestas

## Estructura del Proyecto

### Backend (Node.js + Express + PostgreSQL)

```
priming_back/
├── config/                # Configuraciones
├── controllers/           # Controladores de la API
├── db/                    # Scripts de bases de datos
├── middleware/            # Middlewares
├── routes/                # Rutas de la API
├── utils/                 # Utilidades
├── .env                   # Variables de entorno
├── package.json           # Dependencias
└── server.js              # Punto de entrada
```

### Frontend (React + Styled Components)

```
priming/
├── public/                # Archivos estáticos
├── src/                   # Código fuente
│   ├── components/        # Componentes reutilizables
│   ├── context/           # Contextos (Auth, etc.)
│   ├── pages/             # Páginas principales
│   ├── routes/            # Configuración de rutas
│   ├── styles/            # Estilos globales
│   ├── utils/             # Utilidades
│   └── App.jsx            # Componente principal
└── package.json           # Dependencias
```

## Requisitos Técnicos

- Node.js v16+
- PostgreSQL 12+
- React 18+
- Navegador moderno con soporte de audio

## Instalación y Configuración

### Backend

1. Clonar el repositorio
   ```bash
   git clone https://github.com/tu-usuario/priming.git
   cd priming/priming_back
   ```

2. Instalar dependencias
   ```bash
   npm install
   ```

3. Configurar variables de entorno
   ```bash
   cp .env.example .env
   # Editar .env con tus configuraciones
   ```

4. Crear la base de datos
   ```bash
   psql -U postgres
   CREATE DATABASE priming_db_x;
   \q
   ```

5. Inicializar la base de datos
   ```bash
   psql -U postgres -d priming_db_x -f db/schema.sql
   ```

6. Cargar datos iniciales
   ```bash
   node db/seed.js
   ```

7. Iniciar el servidor
   ```bash
   npm start
   ```

### Frontend

1. Navegar a la carpeta del frontend
   ```bash
   cd ../priming
   ```

2. Instalar dependencias
   ```bash
   npm install
   ```

3. Configurar variables de entorno
   ```bash
   cp .env.example .env
   # Editar .env con tus configuraciones
   ```

4. Iniciar la aplicación
   ```bash
   npm start
   ```

## Funcionalidades

### Panel de Login/Registro
- Registro de acompañantes (evaluadores)
- Inicio de sesión para todos los usuarios

### Administración de Niños
- Registro de información (nombre, edad, grado, colegio, jornada)
- Asignación de evaluadores

### Juegos
- **Cognados**: Palabras que suenan similar en español e inglés
  - Niveles: fácil, medio, difícil
- **Pares Mínimos**: Palabras con pronunciación similar en inglés
  - Niveles: fácil, medio, difícil

### Sistema de Puntuación
- Monedas ganadas/perdidas
- Seguimiento de aciertos y fallos
- Tiempo de completación

### Encuestas de Caracterización
- Evaluación de desempeño
- Registro de observaciones

## API Endpoints

### Autenticación
- `POST /api/register` - Registro de usuarios
- `POST /api/login` - Inicio de sesión
- `GET /api/verify-token` - Verificación de token

### Usuarios
- `GET /api/user` - Datos del usuario actual
- `GET /api/perfil` - Perfil completo
- `PUT /api/perfil` - Actualizar perfil
- `PUT /api/cambiar-password` - Cambiar contraseña

### Evaluadores
- `POST /api/evaluador/asignar-nino` - Asignar niño
- `GET /api/evaluador/ninos` - Listar niños asignados
- `GET /api/evaluador/resultados/:ninoId` - Resultados de un niño

### Niños
- `GET /api/nino/perfil` - Perfil del niño
- `GET /api/nino/progreso` - Progreso en juegos

### Juegos
- `GET /api/juegos` - Listar juegos
- `GET /api/juegos/:juegoId/nivel/:nivelId` - Datos de nivel
- `POST /api/juegos/:juegoId/nivel/:nivelId/progreso` - Guardar progreso

### Encuestas
- `POST /api/encuestas` - Crear encuesta
- `GET /api/encuestas/nino/:nino_id` - Encuestas de un niño
- `PUT /api/encuestas/:encuesta_id` - Actualizar encuesta
- `POST /api/encuestas/:encuesta_id/resultados` - Registrar resultados

## Colaboradores

- Nombre del desarrollador 1 - Rol
- Nombre del desarrollador 2 - Rol

## Licencia

Este proyecto está licenciado bajo los términos de la licencia [MIT](LICENSE).