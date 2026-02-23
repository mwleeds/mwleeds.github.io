Uses [Jekyll](https://jekyllrb.com/) hosted on [GitHub Pages](https://pages.github.com/)

# Getting Started

## Prerequisites

- Docker and Docker Compose
- Node.js (if modifying JavaScript/CSS)

# Development

## Local Development Server

Start Jekyll with live reload:

```bash
docker compose up
```

Then visit http://localhost:4000

The site will automatically reload when you make changes to HTML, Markdown, or CSS files.

## Building Assets

If you modify JavaScript files, rebuild the webpack bundles:

```bash
./build.sh          # Build webpack bundles only
./build.sh --jekyll # Build both webpack and Jekyll site
```

Then restart the docker-compose server to pick up changes.

# Deploying

    ./script/deploy.sh
