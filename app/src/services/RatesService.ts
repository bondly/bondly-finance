import { LocaleManager } from "unifyre-react-helper";

export class CurrencyFormatter {
    unFormat(num: string): string | undefined {
        if (num === '') { return '0';}
        if (!num) return num;
        return LocaleManager.unFormatDecimalString(num);
    }

    format(num: string, isFiat: boolean=false): string | undefined {
        if (!num) return num;
        const decimals = isFiat ? 2 : 4;
        const canonical = LocaleManager.unFormatDecimalString(num);
        if (!canonical) {
            return;
        }
        return LocaleManager.formatDecimalString(canonical, decimals);
    }
}

export const formatter = new CurrencyFormatter();
