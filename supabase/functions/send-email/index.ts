import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const payload = await req.json();
    const waybill = payload.record;
    
    if (!waybill) {
      return new Response(JSON.stringify({ error: "No record found in payload" }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check if Email Alerts are enabled globally
    const { data: settingData, error: settingError } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "email_alerts_enabled")
      .single();

    if (settingError) {
      console.error("Error fetching system_settings:", settingError.message);
      return new Response(JSON.stringify({ error: "Failed to fetch settings" }), { status: 500 });
    }

    const isEnabled = settingData?.value === "true" || settingData?.value === true;
    if (!isEnabled) {
      console.log("Email alerts are disabled globally. Skipping.");
      return new Response(JSON.stringify({ message: "Email alerts disabled" }), { status: 200 });
    }

    // 2. Fetch the client's email via client_id
    if (!waybill.client_id) {
      console.log("No client_id assigned to this waybill. Skipping Email.");
      return new Response(JSON.stringify({ message: "No client assigned" }), { status: 200 });
    }

    const { data: clientData, error: clientError } = await supabase
      .from("client_profiles")
      .select("email, contact_person")
      .eq("id", waybill.client_id)
      .single();

    if (clientError || !clientData || !clientData.email) {
      console.log("No client email found for client_id:", waybill.client_id);
      return new Response(JSON.stringify({ message: "No client email found" }), { status: 200 });
    }

    const clientEmail = clientData.email;
    const clientName = clientData.contact_person || waybill.client_name;

    // 3. Construct the Email Message
    const subject = `CargoNode Update: Waybill ${waybill.tracking_number} is now ${waybill.status}`;
    const message = `Hello ${clientName},\n\nThis is an automated update regarding your CargoNode shipment.\n\nWaybill: ${waybill.tracking_number}\nStatus: ${waybill.status}\nRoute: ${waybill.origin} to ${waybill.destination}\n\nTrack your shipment live at the Client Portal.\n\nRegards,\nThe CargoNode Dispatch Team`;

    // 4. Send the Email via Resend (or mock if no key)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log("----- MOCK EMAIL (RESEND_API_KEY missing) -----");
      console.log(`To: ${clientEmail}`);
      console.log(`Subject: ${subject}`);
      console.log(`Message:\n${message}`);
      console.log("-------------------------------------------------");
      return new Response(JSON.stringify({ message: "Mock Email sent to console" }), { status: 200 });
    }

    console.log(`Sending real Email via Resend to ${clientEmail}...`);
    
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'CargoNode Dispatch <dispatch@cargonode.com>',
        to: [clientEmail],
        subject: subject,
        text: message
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API Error:", errorText);
      return new Response(JSON.stringify({ error: "Resend API failed" }), { status: 500 });
    }

    const result = await resendResponse.json();
    console.log("Resend API Success:", result);

    return new Response(JSON.stringify({ message: "Email sent successfully", data: result }), { status: 200 });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
