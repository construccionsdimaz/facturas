import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Demo purpose: Find the first/main user since we don't have NextAuth yet
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: {
          email: 'admin@nextgen.inc',
          name: 'Admin',
          role: 'ADMIN',
        }
      });
    }
    
    return NextResponse.json({
      companyName: user.companyName,
      companyAddress: user.companyAddress,
      companyCity: user.companyCity,
      companyZip: user.companyZip,
      companyProvince: user.companyProvince,
      companyTaxId: user.companyTaxId,
      companyLogo: user.companyLogo,
      logoZoom: user.logoZoom,
      logoX: user.logoX,
      logoY: user.logoY,
      paymentMethod: user.paymentMethod,
      bankAccount: user.bankAccount,
      dataProtection: user.dataProtection
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      companyName, companyAddress, companyCity, companyZip, companyProvince, companyTaxId, companyLogo, 
      logoZoom, logoX, logoY,
      paymentMethod, bankAccount, dataProtection 
    } = body;

    let user = await db.user.findFirst();
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        companyName,
        companyAddress,
        companyCity,
        companyZip,
        companyProvince,
        companyTaxId,
        companyLogo,
        logoZoom,
        logoX,
        logoY,
        paymentMethod,
        bankAccount,
        dataProtection
      }
    });

    return NextResponse.json({
        companyName: updatedUser.companyName,
        companyAddress: updatedUser.companyAddress,
        companyCity: updatedUser.companyCity,
        companyZip: updatedUser.companyZip,
        companyProvince: updatedUser.companyProvince,
        companyTaxId: updatedUser.companyTaxId,
        companyLogo: updatedUser.companyLogo,
        logoZoom: updatedUser.logoZoom,
        logoX: updatedUser.logoX,
        logoY: updatedUser.logoY,
        paymentMethod: updatedUser.paymentMethod,
        bankAccount: updatedUser.bankAccount,
        dataProtection: updatedUser.dataProtection
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
