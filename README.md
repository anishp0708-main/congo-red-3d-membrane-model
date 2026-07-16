# Congo Red 3D Membrane Flow Model

This is a front-facing Three.js version of the Congo Red membrane visual model. It uses a high-contrast orthographic camera so the pipe system is visible immediately. This revision keeps Congo Red particles inside the pipe, adds blue water molecules, and makes the activated-carbon outlet visibly redder than the chitosan outlet.

## Run on Mac / VS Code

1. Open this folder in VS Code.
2. Open Terminal in VS Code.
3. Run:

```bash
npm install
npm run dev
```

4. Open the local URL shown by Vite, usually:

```text
http://127.0.0.1:5173/
```

## What it shows

- Red Congo Red dye particles and blue water molecules enter a transparent pipe.
- The stream splits into activated carbon and chitosan membrane paths.
- Blue water molecules pass through both membranes easily.
- More red dye particles are captured by chitosan, so its outlet water is clearer.
- The activated-carbon outlet stays visibly redder because more dye remains.
- The values update when C0, V, membrane mass, or contact time change.

The dye is visualized as adsorbing onto membrane/cartridge surfaces. It is not shown as chemical destruction of the molecule.
