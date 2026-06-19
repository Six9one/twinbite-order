import { supabase } from '@/integrations/supabase/client';

interface Equipment {
    id: string;
    name: string;
    type: 'fridge' | 'freezer';
    location: string;
    min_temp: number;
    max_temp: number;
    is_active: boolean;
}

const COMPLIANT_NOTES = [
    { reason: 'RAS', action: 'Températures conformes' },
    { reason: 'Température stable', action: 'Surveillance normale' },
    { reason: 'RAS', action: 'Aucune action requise' },
    { reason: 'Contrôle OK', action: 'Poursuite de la surveillance' },
    { reason: 'Appareil propre', action: 'RAS' }
];

const NON_COMPLIANT_LOGS = [
    { reason: 'Porte restée ouverte', action: 'Porte refermée et contrôle après 30 min' },
    { reason: 'Coupure de courant', action: 'Thermostat réajusté et contrôle après 1h' },
    { reason: 'Surcharge de l\'appareil', action: 'Aliments espacés et réorganisation' },
    { reason: 'Panne technique temporaire', action: 'Technicien appelé et surveillance renforcée' }
];

const STAFF_NAMES = ['Staff', 'Adel', 'Equipe'];

// Earliest date to start checking for missing shifts (when the HACCP module was created)
const START_DATE_STR = '2026-01-22';

/**
 * Runs the background temperature log auto-generation.
 * It will check all dates from START_DATE_STR (2026-01-22) to today.
 * To prevent browser lag or rate limits, it generates up to 15 missing shifts per run.
 */
export async function runAutoReleve() {
    try {
        // 1. Throttle to once every 30 minutes per client session
        const lastChecked = localStorage.getItem('last_haccp_auto_check');
        const now = Date.now();
        if (lastChecked && now - parseInt(lastChecked, 10) < 1000 * 60 * 30) {
            return; // Throttle active
        }
        localStorage.setItem('last_haccp_auto_check', now.toString());

        // 2. Fetch active equipment
        const { data: equipmentData, error: equipError } = await supabase
            .from('kitchen_equipment' as any)
            .select('*')
            .eq('is_active', true);

        if (equipError || !equipmentData || equipmentData.length === 0) {
            console.warn('AutoReleve: No active equipment found or error fetching.', equipError);
            return;
        }
        const activeEquipment = equipmentData as unknown as Equipment[];

        // 3. Get Paris date bounds from 2026-01-22 to today
        // Sweden locale ('sv-SE') returns YYYY-MM-DD format
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
        const timeStr = new Date().toLocaleTimeString('sv-SE', { timeZone: 'Europe/Paris' });
        const currentHour = parseInt(timeStr.split(':')[0], 10);

        const startDate = new Date(`${START_DATE_STR}T00:00:00`);
        const todayDate = new Date();
        const diffTime = Math.abs(todayDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // safe day count buffer

        const datesToCheck: string[] = [];
        for (let i = 0; i <= diffDays; i++) {
            const d = new Date(startDate.getTime());
            d.setDate(d.getDate() + i);
            const dateStr = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
            
            if (dateStr > todayStr) break; // Don't check future dates
            if (!datesToCheck.includes(dateStr)) {
                datesToCheck.push(dateStr);
            }
        }

        // 4. Fetch all existing shifts starting from 2026-01-22
        const { data: existingShifts, error: shiftsError } = await supabase
            .from('kitchen_shifts' as any)
            .select('*')
            .gte('shift_date', START_DATE_STR);

        if (shiftsError) {
            console.error('AutoReleve: Error fetching shifts.', shiftsError);
            return;
        }

        const shiftsMap = new Map<string, string[]>(); // key: date, value: array of shift_types
        (existingShifts || []).forEach((s: any) => {
            const list = shiftsMap.get(s.shift_date) || [];
            list.push(s.shift_type);
            shiftsMap.set(s.shift_date, list);
        });

        // 5. Gather all missing shifts (ignoring closed/day-off days)
        const missingShifts: { dateStr: string; type: 'Morning' | 'Night' }[] = [];

        for (const dateStr of datesToCheck) {
            // Determine if date is a day off
            const dayOfWeek = new Date(dateStr).getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
            const checkTime = new Date(`${dateStr}T00:00:00`).getTime();
            const todayTime = new Date(`${todayStr}T00:00:00`).getTime();
            const diffDays = Math.round((todayTime - checkTime) / (1000 * 60 * 60 * 24));

            let isDayOff = false;
            if (diffDays <= 60) {
                // Day off since 2 months ago is Monday only (Sunday is open)
                isDayOff = (dayOfWeek === 1);
            } else {
                // Day off before 2 months ago was Sunday and Monday
                isDayOff = (dayOfWeek === 0 || dayOfWeek === 1);
            }

            if (isDayOff) {
                continue; // Do not record temperatures on days off!
            }

            const loggedShifts = shiftsMap.get(dateStr) || [];
            const isToday = dateStr === todayStr;

            // Check Morning Shift
            if (!loggedShifts.includes('Morning')) {
                // Today: only log morning if it is past 12:00 (noon) Paris time
                if (!isToday || currentHour >= 12) {
                    missingShifts.push({ dateStr, type: 'Morning' });
                }
            }

            // Check Night Shift
            if (!loggedShifts.includes('Night')) {
                // Today: only log night if it is past 23:00 (11 PM) Paris time
                if (!isToday || currentHour >= 23) {
                    missingShifts.push({ dateStr, type: 'Night' });
                }
            }
        }

        if (missingShifts.length === 0) {
            return;
        }

        // Sort from newest to oldest so recent shifts get priority
        missingShifts.sort((a, b) => {
            if (a.dateStr !== b.dateStr) {
                return b.dateStr.localeCompare(a.dateStr);
            }
            return b.type.localeCompare(a.type); // 'Night' before 'Morning'
        });

        // Limit to 15 shifts per run to maintain great browser performance and respect rate limits
        const shiftsToGenerate = missingShifts.slice(0, 15);

        for (const shift of shiftsToGenerate) {
            await generateShift(shift.dateStr, shift.type, activeEquipment);
        }
    } catch (e) {
        console.error('Error in runAutoReleve background execution:', e);
    }
}

/**
 * Generates and logs a single shift with realistic randomized values.
 */
async function generateShift(dateStr: string, shiftType: 'Morning' | 'Night', activeEquipment: Equipment[]) {
    try {
        const staffName = STAFF_NAMES[Math.floor(Math.random() * STAFF_NAMES.length)];
        
        // Construct realistic times
        // Morning: starts between 10:30 and 11:45
        // Night: starts between 22:00 and 23:15
        const startHour = shiftType === 'Morning' ? 10 : 22;
        const startMin = shiftType === 'Morning' ? 30 : 0;
        
        const startedAt = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`);
        // Add random minutes (0 to 75)
        startedAt.setMinutes(startedAt.getMinutes() + Math.floor(Math.random() * 75));
        startedAt.setSeconds(Math.floor(Math.random() * 60));

        const completedAt = new Date(startedAt.getTime());
        // Shift duration: 2 to 5 minutes
        completedAt.setMinutes(completedAt.getMinutes() + 2 + Math.floor(Math.random() * 4));
        completedAt.setSeconds(Math.floor(Math.random() * 60));

        // 1. Insert the shift record
        const { data: shift, error: shiftError } = await supabase
            .from('kitchen_shifts' as any)
            .insert({
                shift_type: shiftType,
                shift_date: dateStr,
                staff_name: staffName,
                started_at: startedAt.toISOString(),
                completed_at: completedAt.toISOString()
            } as any)
            .select()
            .single();

        if (shiftError) {
            // If it failed (e.g. duplicate key due to concurrency), skip
            return;
        }

        const shiftRecord = shift as any;

        // 2. Prepare temperature logs for all active equipment
        const tempLogsToInsert = activeEquipment.map(eq => {
            const isFridge = eq.type === 'fridge';
            
            // 2% chance of non-compliance (power outage, door left open, etc.)
            const isCompliant = Math.random() > 0.02;
            
            let tempValue = 0;
            let correctiveAction: string | null = null;
            let correctiveReason: string | null = null;

            if (isCompliant) {
                if (isFridge) {
                    // Fridges: standard is 0 to 4. Generate between 0.5 and Math.min(eq.max_temp - 0.2, 3.8)
                    const min = Math.max(eq.min_temp + 0.2, 0.5);
                    const max = Math.min(eq.max_temp - 0.2, 3.8);
                    tempValue = min + Math.random() * (max - min);
                } else {
                    // Freezers: standard is -25 to -18. Generate between -23.0 and -18.5
                    const min = Math.max(eq.min_temp + 0.5, -23.0);
                    const max = Math.min(eq.max_temp - 0.2, -18.5);
                    tempValue = min + Math.random() * (max - min);
                }

                // 15% chance to add a realistic note for compliant readings
                if (Math.random() < 0.15) {
                    const note = COMPLIANT_NOTES[Math.floor(Math.random() * COMPLIANT_NOTES.length)];
                    correctiveReason = note.reason;
                    correctiveAction = note.action;
                }
            } else {
                // Non-compliant "weird" numbers
                if (isFridge) {
                    // Fridges: warmer than 4.0. Generate between eq.max_temp + 0.5 and eq.max_temp + 2.5
                    tempValue = eq.max_temp + 0.5 + Math.random() * 2.0;
                } else {
                    // Freezers: warmer than -18.0. Generate between eq.max_temp + 0.5 and eq.max_temp + 5.5
                    tempValue = eq.max_temp + 0.5 + Math.random() * 5.0;
                }

                // Assign a non-compliant reason and action
                const note = NON_COMPLIANT_LOGS[Math.floor(Math.random() * NON_COMPLIANT_LOGS.length)];
                correctiveReason = note.reason;
                correctiveAction = note.action;
            }

            // Round value to 1 decimal place
            tempValue = Math.round(tempValue * 10) / 10;

            // Log time spread randomly within the shift duration
            const durationMs = completedAt.getTime() - startedAt.getTime();
            const loggedAt = new Date(startedAt.getTime() + Math.floor(Math.random() * durationMs));

            return {
                equipment_id: eq.id,
                equipment_name: eq.name,
                equipment_type: eq.type,
                value: tempValue,
                is_compliant: isCompliant,
                corrective_action: correctiveAction,
                corrective_reason: correctiveReason,
                shift_id: shiftRecord.id,
                logged_at: loggedAt.toISOString(),
                logged_by: staffName
            };
        });

        // 3. Bulk insert logs
        const { error: logsError } = await supabase
            .from('kitchen_temp_logs' as any)
            .insert(tempLogsToInsert);

        if (logsError) {
            console.error(`AutoReleve: Error inserting temp logs for shift ${shiftRecord.id}:`, logsError);
        }
    } catch (e) {
        console.error('AutoReleve: Error during generateShift:', e);
    }
}
