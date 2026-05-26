import "altcha/external";
import "altcha/altcha.css";
import Pbkdf2Worker from "altcha/workers/pbkdf2?worker";

$altcha.algorithms.set("PBKDF2/SHA-256", () => new Pbkdf2Worker());

export function connect(form: HTMLFormElement): void {
    const widget = form.querySelector("altcha-widget");
    if (widget == null) return;

    form.addEventListener("verifyaltcha", async () => {
        const result = await widget.verify();
        form.dispatchEvent(
            new CustomEvent("submitwithaltcha", { detail: result?.payload })
        );
    });
}
