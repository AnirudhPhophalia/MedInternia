// Provide a valid-length JWT_SECRET for the test environment so modules that
// validate it at import time (src/utils/jwt.ts) don't process.exit during
// test collection. Production still requires this to be set explicitly and
// still enforces the same minimum length -- this only unblocks tests.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = "test-jwt-secret-for-unit-tests-only-not-real";
}
if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) {
    process.env.JWT_ACCESS_SECRET = "test-jwt-access-secret-for-unit-tests-only-not-real";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
    process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret-for-unit-tests-only-not-real";
}

// Stub email credentials so mailer.ts (which throws at module load when these
// are absent) can be safely imported during test collection. Individual test
// files that need to assert email behaviour mock the transporter directly via
// jest.mock('../../utils/mailer', () => ({ sendMail: jest.fn() })).
if (!process.env.EMAIL_USER) {
    process.env.EMAIL_USER = "test@example.com";
}
if (!process.env.EMAIL_PASS) {
    process.env.EMAIL_PASS = "test-password-for-unit-tests-only";
}
