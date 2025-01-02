# HelpDesk AI

An intelligent helpdesk system powered by AI that handles customer inquiries across multiple channels including email, Slack, and Google Chat.

## Features

- Multi-channel support (Email, Slack, Google Chat)
- OAuth2 authentication
- Customer card management
- Issue tracking
- File attachment handling
- Admin dashboard
- Real-time notifications
- Health monitoring

## Project Structure

- `src/` - Core application code
  - `components/` - UI components
  - `services/` - Business logic services
  - `templates/` - HTML templates
  - `tests/` - Test files
  - `types/` - TypeScript type definitions
  - `utils/` - Utility functions

## Documentation

See the [docs](docs/README.md) directory for detailed documentation.

## Development

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
- Copy `src/config.example.js` to `config.js`
- Update with your settings

3. Run tests:
```bash
npm test
```

4. Start development server:
```bash
npm run dev
```

## License

MIT
