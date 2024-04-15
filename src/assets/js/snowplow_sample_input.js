// Track Custom Event (Self Describing Event) - Sample Input
function send_to_snowplow_collector() {
    console.log("send_to_snowplow_collector function called");
    let sampleInput = document.getElementById("sample_input").value;
    console.log(sampleInput);
    snowplow('trackSelfDescribingEvent', {
            schema: 'iglu:com.patrick-cloud/sample_input/jsonschema/1-0-0',
            data: {
                sampleInput: sampleInput
            }
        }
    );
}