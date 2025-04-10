# piepacker

Pack as many pies into the play field as possible; a physics engine experiment using Phaser.

## Play Online

[Play Piepacker on GitHub Pages](https://rootlake.github.io/piepacker/) (Note: Link will be live after deployment)

## Development

This project uses [Vite](https://vitejs.dev/) and [TypeScript](https://www.typescriptlang.org/).

### Prerequisites

*   Node.js (version 18 or later recommended)
*   npm (usually comes with Node.js)

### Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/rootlake/piepacker.git
    cd piepacker
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running Locally

```bash
npm run dev
```

This will start a local development server, typically at `http://localhost:5173`.

### Building for Production

```bash
npm run build
```

This command compiles the TypeScript code and bundles the assets into the `dist/` directory, ready for deployment.

## Deployment to GitHub Pages

This project is configured to deploy to GitHub Pages.

1.  Ensure your repository is set up on GitHub (`https://github.com/rootlake/piepacker`).
2.  Run the build command: `npm run build`.
3.  Push the contents of the `dist` folder to the `gh-pages` branch of your repository. A common way to do this is using the `gh-pages` package:
    *   Install the package: `npm install --save-dev gh-pages`
    *   Add a deploy script to `package.json`:
        ```json
        "scripts": {
          // ... other scripts
          "deploy": "npm run build && gh-pages -d dist"
        }
        ```
    *   Run the deploy script: `npm run deploy`
4.  Configure your repository's GitHub Pages settings to deploy from the `gh-pages` branch. 