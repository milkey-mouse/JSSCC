// adapted from http://quirksmode.org/js/cookies.html
class Cookies
{
    public static write(name: string, value: string, days: number = 365): void {
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            var expires = "; expires=" + date.toUTCString();
        }
        else {
            var expires = "";
        }
        document.cookie = name + "=" + value + expires + "; path=/";
    }

    public static get(name: string, fallback: string): string {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return fallback;
    }

    public static delete(name: string): void {
        Cookies.write(name, "", -1);
    }
}