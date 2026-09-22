# OCR local en Mac y Windows

El backend conserva `POST /api/ocr/recognize` y usa un servicio Python con
**PP-OCRv4 de PaddleOCR mediante RapidOCR y ONNX Runtime en CPU**.
El paquete RapidOCR 1.4.4 incluye los tres modelos: no hay descargas al arrancar
ni durante las lecturas. No requiere cuenta, API key, suscripción ni GPU.

Con 16 GB de RAM se puede comenzar con un proceso OCR. La velocidad y precisión
se deben medir con el procesador y las imágenes reales de cada equipo.
Usa Python **3.11 de 64 bits** para instalaciones nuevas (3.9–3.12 compatibles;
no Python 3.13). No copies `.venv` entre Mac y Windows: instala en cada sistema.

## Instalación inicial con internet

Desde la raíz del repositorio, en **Mac**:

```bash
python3.11 -m venv ocr-service/.venv
ocr-service/.venv/bin/python -m pip install -r ocr-service/requirements.txt
```

En **Windows x64, PowerShell**:

```powershell
py -3.11 -m venv ocr-service/.venv
.\ocr-service\.venv\Scripts\python.exe -m pip install -r ocr-service/requirements.txt
```

No hace falta activar el entorno ni modificar las políticas de PowerShell.
Si Windows informa que falta una DLL al importar ONNX Runtime, instala Microsoft
Visual C++ Redistributable 2015–2022 x64.

## Arranque sin internet

Mantén una terminal abierta desde la raíz del repositorio.

**Mac:**

```bash
ocr-service/.venv/bin/python -m uvicorn app:app --app-dir ocr-service --host 127.0.0.1 --port 8001 --workers 1
```

**Windows:**

```powershell
.\ocr-service\.venv\Scripts\python.exe -m uvicorn app:app --app-dir ocr-service --host 127.0.0.1 --port 8001 --workers 1
```

Comprueba `http://127.0.0.1:8001/health`. Inicia PostgreSQL, backend y web según el
README principal. El backend usa por defecto:

```env
OCR_SERVICE_URL="http://127.0.0.1:8001"
OCR_TIMEOUT_MS="20000"
```

El backend y el lector corren en el mismo equipo. El puerto 8001 escucha solo en
loopback: móvil y web acceden al backend autenticado. Pueden usar Wi-Fi local sin
internet. Para operación permanente del móvil prepara una app instalada con sus
recursos locales; esto no convierte Expo Go en una instalación offline. La cámara
web necesita localhost o HTTPS cuando se accede desde otro equipo.

## Uso y validación

- Activa la cámara y procura que los caracteres se vean grandes y enfocados.
- **Leer solo la zona central** recorta realmente la imagen al rectángulo mostrado.
- La consulta automática exige dos lecturas consecutivas coincidentes separadas
  por no más de 15 segundos. No se necesita escribir la placa ni pulsar Buscar.
- Verifica vehículo y estudiantes y confirma o deniega la salida. El OCR no crea
  eventos automáticamente.
- La web reintenta automáticamente las lecturas dudosas. En móvil, la consulta se
  realiza al reconocer la foto; si no es legible, se solicita otra foto.
  Una imagen ilegible no se registra como vehículo no autorizado.

Se detectan y rectifican zonas de texto; no se incluye YOLO ni un modelo de placas
entrenado específicamente para Colombia. No se unen textos distantes ni se toman
los primeros seis caracteres de cualquier resultado. Se admiten `ABC123` y `ABC12D`.
Las placas partidas en varios bloques o dos líneas pueden requerir otro encuadre.
Las correcciones por posición no se aceptan automáticamente; el último carácter no
se cambia porque puede ser letra o número. La puntuación no es una probabilidad
calibrada de identificación correcta del vehículo.

El umbral inicial es 0.90. Para modificarlo define `OCR_MIN_SCORE` en la terminal
del servicio Python antes de iniciarlo; no se lee desde `backend/.env`:

```bash
export OCR_MIN_SCORE=0.95
```

```powershell
$env:OCR_MIN_SCORE = "0.95"
```

El servicio acepta JPEG, PNG y WebP de hasta 5 MB y 16 megapíxeles, sin guardar las
imágenes. Procesa una imagen a la vez y devuelve 429 si está ocupado.

## Equipo completamente aislado

En un equipo con el mismo sistema, arquitectura y versión de Python, descarga
las dependencias con su intérprete:

```bash
python -m pip download --only-binary=:all: -r ocr-service/requirements.txt -d wheelhouse
```

Copia el proyecto, `wheelhouse` y el instalador de Python al equipo aislado, crea
su entorno virtual y usa el ejecutable Python de ese entorno:

```bash
python -m pip install --no-index --find-links=wheelhouse -r ocr-service/requirements.txt
```

También deben prepararse Node.js, dependencias npm, PostgreSQL y frontend antes
de desconectar el equipo.

## Pruebas

Desde `ocr-service`, usando el Python del entorno:

```bash
python -m pip install -r requirements-dev.txt
python -m unittest -v test_ocr
```

Desde `backend`: `node --test test/ocr.test.js`.
Desde `frontend-web`: `CI=true npx react-scripts test --watchAll=false --runInBand`.
En PowerShell establece primero `$env:CI="true"` y omite el prefijo `CI=true`.

Incluye una lectura sintética con conexiones Python bloqueadas, validación, EXIF,
imágenes inválidas y errores HTTP. La prueba sintética no mide la mejora frente a
Tesseract. Evalúa fotos etiquetadas reales (día, noche, reflejos) y compara placa
completa exacta, lecturas incorrectas, casos sin lectura y latencia.
Windows necesita validación en el equipo destino.

## Fuentes y licencias

- [RapidOCR 1.4.4, Apache-2.0](https://pypi.org/project/rapidocr-onnxruntime/1.4.4/)
- [PaddleOCR, Apache-2.0](https://github.com/PaddlePaddle/PaddleOCR)
- [ONNX Runtime, MIT](https://github.com/microsoft/onnxruntime)

Conserva los avisos de licencia al distribuir la aplicación.
