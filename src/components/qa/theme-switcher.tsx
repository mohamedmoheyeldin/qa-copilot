import { Monitor01, Moon01, Sun } from "@untitledui/icons";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { useTheme } from "@/providers/theme-provider";

type Theme = "light" | "dark" | "system";

/** Light, dark, or follow the operating system. The choice is saved in this browser. */
export const ThemeSwitcher = () => {
    const { theme, setTheme } = useTheme();

    return (
        <ButtonGroup
            size="sm"
            aria-label="Color theme"
            selectedKeys={new Set([theme])}
            onSelectionChange={(keys) => {
                const [k] = [...keys];
                if (k) setTheme(k as Theme);
            }}
            disallowEmptySelection
        >
            <ButtonGroupItem id="light" iconLeading={Sun} aria-label="Light theme" />
            <ButtonGroupItem id="dark" iconLeading={Moon01} aria-label="Dark theme" />
            <ButtonGroupItem id="system" iconLeading={Monitor01} aria-label="Match system theme" />
        </ButtonGroup>
    );
};
