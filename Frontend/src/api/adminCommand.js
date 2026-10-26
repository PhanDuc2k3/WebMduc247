// Keep the same key after an uncertain network result; editing the command starts a new attempt.
export function adminRequestId(attempt, input) {
    const signature = JSON.stringify(input);
    if (attempt.signature !== signature) {
        attempt.signature = signature;
        attempt.requestId = crypto.randomUUID();
    }
    return attempt.requestId;
}
