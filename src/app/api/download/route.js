import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET() {
  try {
    await connectToDatabase();

    const users = await User.find({}, { email: 1, phone: 1 });

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const fontSize = 12;
    const lineHeight = 20;

    let page = pdfDoc.addPage();
    let y = page.getHeight() - 40;

    // Title
    page.drawText("User Contact List", {
      x: 50,
      y,
      size: 18,
      font,
      color: rgb(0, 0, 0),
    });

    y -= 40;

    users.forEach((u, i) => {
      // If Y reaches bottom → add new page
      if (y < 50) {
        page = pdfDoc.addPage();
        y = page.getHeight() - 40;

        page.drawText(`User Contact List (continued...)`, {
          x: 50,
          y,
          size: 16,
          font,
        });

        y -= 30;
      }

      page.drawText(
        `${i + 1}. Email: ${u.email || "N/A"} | Phone: ${u.phone || "N/A"}`,
        { x: 50, y, size: fontSize, font }
      );

      y -= lineHeight;
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=users.pdf",
        "Content-Transfer-Encoding": "binary",
      },
    });
  } catch (error) {
    console.error("PDF Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
