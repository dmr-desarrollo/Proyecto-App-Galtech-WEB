import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.print.PrintService;
import javax.print.PrintServiceLookup;

class PrintLookup {
    public static void main(String[] args) {
        for (PrintService printer : PrintServiceLookup.lookupPrintServices(null, null)) {
            System.out.println(Base64.getEncoder().encodeToString(printer.getName().getBytes(StandardCharsets.UTF_8)));
        }
    }
}
