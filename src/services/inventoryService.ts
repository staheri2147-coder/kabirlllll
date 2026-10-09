import { StorageService } from './storageService';
import { Material, MaterialMovement, MovementType } from '../types';

export class InventoryService {
  static recordMovement(data: {
    material_id?: string;
    material_name?: string;
    warehouse_id?: string;
    type: MovementType;
    quantity: number;
    bags_count?: number;
    driver_name?: string;
    driver_phone?: string;
    vehicle_plate?: string;
    reference_type?: string;
    reference_id?: string;
    description?: string;
    created_at?: string;
  }): { success: boolean; message: string; movement?: MaterialMovement } {
    const rawMatName = (data.material_name || '').trim();
    if (!data.material_id && !rawMatName) {
      return { success: false, message: 'ورود نام ماده اولیه الزامی است.' };
    }
    if (!data.quantity || data.quantity <= 0) {
      return { success: false, message: 'مقدار وزن باید بزرگتر از صفر باشد.' };
    }

    const materials = StorageService.getMaterials();
    let matIndex = data.material_id ? materials.findIndex((m) => m.id === data.material_id) : -1;

    if (matIndex === -1 && rawMatName) {
      matIndex = materials.findIndex((m) => m.name.toLowerCase() === rawMatName.toLowerCase());
    }

    let material: Material;
    if (matIndex === -1) {
      // Create new material entry dynamically if it doesn't exist
      const nextCode = `MAT-${1001 + materials.length}`;
      const newMat: Material = {
        id: `mat-${Date.now()}`,
        name: rawMatName,
        code: nextCode,
        category: 'گرانول پلی‌اتیلن',
        unit: 'کیلوگرم',
        current_stock: data.type === 'in' ? data.quantity : 0,
        min_stock_alert: 500,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      materials.push(newMat);
      StorageService.saveMaterials(materials);
      material = newMat;
    } else {
      material = materials[matIndex];
      let newStock = material.current_stock || 0;
      if (data.type === 'in' || data.type === 'return_in') {
        newStock += data.quantity;
      } else if (data.type === 'out' || data.type === 'waste') {
        newStock = Math.max(0, newStock - data.quantity);
      } else if (data.type === 'adjustment') {
        newStock = data.quantity;
      }
      materials[matIndex].current_stock = newStock;
      materials[matIndex].updated_at = new Date().toISOString();
      StorageService.saveMaterials(materials);
      material = materials[matIndex];
    }

    const warehouses = StorageService.getWarehouses();
    const warehouse = warehouses[0] || { id: 'wh-1', name: 'انبار مرکزی کارخانه' };

    const currentUser = StorageService.getActiveUser();
    const movements = StorageService.getMovements();

    const movementId = `mov-${Date.now()}`;
    const newMovement: MaterialMovement = {
      id: movementId,
      code: StorageService.generateMovementCode(),
      material_id: material.id,
      material_name: rawMatName || material.name,
      material_code: material.code,
      warehouse_id: warehouse.id,
      warehouse_name: warehouse.name,
      type: data.type,
      quantity: data.quantity,
      bags_count: data.bags_count,
      driver_name: data.driver_name,
      driver_phone: data.driver_phone,
      vehicle_plate: data.vehicle_plate,
      reference_type: data.reference_type,
      reference_id: data.reference_id,
      description: data.description,
      created_by: currentUser.name,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    movements.unshift(newMovement);
    StorageService.saveMovements(movements);

    StorageService.logAudit(
      `ثبت گردش انبار (${data.type}) برای ${newMovement.material_name} به مقدار ${data.quantity} kg`,
      'WAREHOUSE',
      movementId,
      null,
      newMovement
    );

    return {
      success: true,
      message: 'گردش انبار با موفقیت ثبت شد.',
      movement: newMovement,
    };
  }
}
