import { triggerConfetti, animateSuccess } from "./confetti";

export interface SubmitOptions {
    formId: string;
    statusId: string;
    progressId?: string;
    successMessage?: string;
    validateFn?: (form: HTMLFormElement) => string | null;
    useXHR?: boolean;
}

export function setupFormHandler(options: SubmitOptions) {
    const form = document.getElementById(options.formId);
    const status = document.getElementById(options.statusId);
    const uploadProgress = options.progressId 
        ? document.getElementById(options.progressId) 
        : null;

    if (!(form instanceof HTMLFormElement) || !(status instanceof HTMLElement)) {
        return;
    }

    async function handleSubmit(event: Event) {
        event.preventDefault();
        if (
            !(form instanceof HTMLFormElement) ||
            !(status instanceof HTMLElement)
        ) {
            return;
        }

        // Custom validation
        if (options.validateFn) {
            const error = options.validateFn(form);
            if (error) {
                status.textContent = `❌ ${error}`;
                status.className = "status status--error";
                return;
            }
        }

        // Show loading state
        const button = form.querySelector("button[type='submit']");
        const buttonText = button?.querySelector(".button-text");
        const buttonSpinner = button?.querySelector(".button-spinner");
        if (button && buttonText && buttonSpinner) {
            (button as HTMLButtonElement).disabled = true;
            (buttonText as HTMLElement).style.display = "none";
            (buttonSpinner as HTMLElement).style.display = "inline";
        }
        status.textContent = "⏳ Submitting…";
        status.className = "status status--loading";

        // Show upload progress if needed
        if (uploadProgress && options.useXHR) {
            uploadProgress.style.display = "block";
        }

        try {
            let responseText: string;
            let responseOk: boolean;

            if (options.useXHR && uploadProgress) {
                // Use XHR for progress tracking
                const result = await submitWithProgress(form, uploadProgress);
                responseText = result.text;
                responseOk = result.ok;
            } else {
                // Use fetch
                const formData = form.enctype === "multipart/form-data" 
                    ? new FormData(form)
                    : JSON.stringify(Object.fromEntries(new FormData(form)));
                const headers = form.enctype === "multipart/form-data"
                    ? {}
                    : { "Content-Type": "application/json" };

                const response = await fetch(form.action, {
                    method: "POST",
                    headers,
                    body: formData,
                });
                responseText = await response.text();
                responseOk = response.ok;
            }

            let parsed;
            try {
                parsed = JSON.parse(responseText);
            } catch {
                parsed = null;
            }

            if (!responseOk) {
                const errorMessage =
                    parsed && typeof parsed === "object" && "error" in parsed
                        ? parsed.error
                        : responseText || "Request failed";
                status.textContent = `❌ ${String(errorMessage)}`;
                status.className = "status status--error";
                return;
            }

            const successMsg = options.successMessage || "✅ Submitted successfully!";
            status.textContent = successMsg;
            status.className = "status status--success";
            
            // Trigger success animations
            animateSuccess(form);
            const rect = button?.getBoundingClientRect();
            if (rect) {
                triggerConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }
            
            form.reset();
        } catch (error) {
            status.textContent = `❌ ${error instanceof Error ? error.message : "Unknown error"}`;
            status.className = "status status--error";
        } finally {
            // Reset button state
            if (button && buttonText && buttonSpinner) {
                (button as HTMLButtonElement).disabled = false;
                (buttonText as HTMLElement).style.display = "inline";
                (buttonSpinner as HTMLElement).style.display = "none";
            }
            // Hide upload progress
            if (uploadProgress) {
                setTimeout(() => {
                    uploadProgress.style.display = "none";
                    const progressFill = uploadProgress.querySelector(".progress-fill");
                    if (progressFill instanceof HTMLElement) {
                        progressFill.style.width = "0%";
                    }
                }, 2000);
            }
        }
    }

    form.addEventListener("submit", handleSubmit);
}

function submitWithProgress(
    form: HTMLFormElement,
    progressContainer: HTMLElement
): Promise<{ text: string; ok: boolean }> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                const progressFill = progressContainer.querySelector(".progress-fill");
                const progressText = progressContainer.querySelector(".progress-text");
                if (progressFill instanceof HTMLElement) {
                    progressFill.style.width = percentComplete + "%";
                }
                if (progressText) {
                    progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
                }
            }
        });

        xhr.addEventListener("load", () => {
            resolve({ 
                text: xhr.responseText, 
                ok: xhr.status >= 200 && xhr.status < 300 
            });
        });
        
        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.open("POST", form.action);
        xhr.send(new FormData(form));
    });
}
