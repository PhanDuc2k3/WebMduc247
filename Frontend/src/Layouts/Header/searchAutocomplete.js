export function scheduleAutocomplete(request, onSuccess, onError, delay = 300) {
    const controller = new AbortController();
    let active = true;
    const timer = globalThis.setTimeout(async () => {
        try {
            const result = await request(controller.signal);
            if (active && !controller.signal.aborted)
                onSuccess(result);
        }
        catch (error) {
            if (active && !controller.signal.aborted)
                onError(error);
        }
    }, delay);
    return () => { active = false; globalThis.clearTimeout(timer); controller.abort(); };
}
