# Project FLow

Initial Administrator Setup — Mandatory

Implement and verify a secure initial administrator setup process.

I must be able to register my own account and then securely receive Administrator privileges through a documented setup procedure.

Do not automatically grant Administrator privileges to the first registered user.

Do not expose a public registration option, button, or API that allows users to grant themselves Administrator privileges.

Use a trusted server-side operation or restricted database setup script to promote my designated account.

Ensure this operation can only be performed by an authorized operator and cannot be reused by ordinary users.

Regular users registering afterward must receive standard user privileges.

Document the exact steps I must follow to initialize the Administrator account in the README.

Test that the Administrator can access authorized administrative features and that a regular user cannot access or grant those privileges.

Do not claim administrator setup is complete until the process has been implemented and verified.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0a2b32c5-657b-44e4-9f3d-9fb3a976a0ad).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
