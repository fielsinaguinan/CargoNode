import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const SEMAPHORE_API_URL = "https://api.semaphore.co/api/v4/messages";

serve(async (req) => {
  try {
    // 1. Verify Method & Auth (optional for webhooks but good practice)
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Parse the webhook payload
    const payload = await req.json();
    const waybill = payload.record;
    
    if (!waybill) {
      return new Response(JSON.stringify({ error: "No record found in payload" }), { status: 400 });
    }

    // 2. Initialize Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn("Supabase env vars missing. Continuing without DB lookup if possible.");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Check if SMS Alerts are enabled globally
    const { data: settingData, error: settingError } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "sms_alerts_enabled")
      .single();

    if (settingError) {
      console.error("Error fetching system_settings:", settingError.message);
      return new Response(JSON.stringify({ error: "Failed to fetch settings" }), { status: 500 });
    }

    const isEnabled = settingData?.value === "true" || settingData?.value === true;
    if (!isEnabled) {
      console.log("SMS alerts are disabled globally. Skipping.");
      return new Response(JSON.stringify({ message: "SMS alerts disabled" }), { status: 200 });
    }

    // 4. Fetch the driver's phone number assigned to this waybill's prime mover
    if (!waybill.prime_mover_id) {
      console.log("No prime mover assigned to this waybill. Skipping SMS.");
      return new Response(JSON.stringify({ message: "No prime mover assigned" }), { status: 200 });
    }

    const { data: driverData, error: driverError } = await supabase
      .from("drivers")
      .select("phone_number, full_name")
      .eq("prime_mover_id", waybill.prime_mover_id)
      .single();

    if (driverError || !driverData) {
      console.log("No driver found for prime mover:", waybill.prime_mover_id);
      return new Response(JSON.stringify({ message: "No driver found" }), { status: 200 });
    }

    const phoneNumber = driverData.phone_number;
    if (!phoneNumber) {
      console.log(`Driver ${driverData.full_name} does not have a phone number. Skipping SMS.`);
      return new Response(JSON.stringify({ message: "Driver missing phone number" }), { status: 200 });
    }

    // 5. Construct the SMS Message
    const message = `CargoNode Update: Your assigned waybill (${waybill.tracking_number}) for ${waybill.client_name} is now '${waybill.status}'. Route: ${waybill.origin} to ${waybill.destination}.`;

    // 6. Send the SMS via Semaphore API
    const semaphoreApiKey = Deno.env.get("SEMAPHORE_API_KEY");
    
    if (!semaphoreApiKey) {
      console.log("----- MOCK SMS (SEMAPHORE_API_KEY missing) -----");
      console.log(`To: ${phoneNumber}`);
      console.log(`Message: ${message}`);
      console.log("-------------------------------------------------");
      return new Response(JSON.stringify({ message: "Mock SMS sent to console" }), { status: 200 });
    }

    console.log(`Sending real SMS via Semaphore to ${phoneNumber}...`);
    
    const formData = new URLSearchParams();
    formData.append("apikey", semaphoreApiKey);
    formData.append("number", phoneNumber);
    formData.append("message", message);
    
    const response = await fetch(SEMAPHORE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Semaphore API Error:", errorText);
      return new Response(JSON.stringify({ error: "Semaphore API failed" }), { status: 500 });
    }

    const result = await response.json();
    console.log("Semaphore API Success:", result);

    return new Response(JSON.stringify({ message: "SMS sent successfully", data: result }), { status: 200 });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
