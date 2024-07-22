import React, { useState } from "react";
// @ts-ignore
import { JIFFClient, JIFFClientBigNumber } from "jiff-mpc";

const JiffClientComponent: React.FC = () => {
  const [jiffClient, setJiffClient] = useState<typeof JIFFClient | null>(null);
  const [computationId, setComputationId] = useState<string>("");
  const [partyCount, setPartyCount] = useState<number>(0);
  const [number, setNumber] = useState<number | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(true);

  const connect = () => {
    const client = new JIFFClient(
      process.env.NODE_ENV === "development"
        ? "http://localhost:8080"
        : "https://jiff-test.onrender.com:10000",
      computationId,
      {
        autoConnect: false,
        party_count: partyCount,
        crypto_provider: true,
        // @ts-ignore
        onError: (_, error) => {
          setOutput((prev) => [...prev, `<p class='error'>${error}</p>`]);
        },
        onConnect: () => {
          setButtonDisabled(false);
          setOutput((prev) => [...prev, "<p>All parties Connected!</p>"]);
        },
      }
    );

    client.apply_extension(JIFFClientBigNumber, {});
    client.connect();
    setJiffClient(client);
  };

  const submit = async () => {
    if (number === null || isNaN(number)) {
      setOutput((prev) => [
        ...prev,
        "<p class='error'>Input a valid number!</p>",
      ]);
      return;
    } else if (number > 100 || number < 0 || number !== Math.floor(number)) {
      setOutput((prev) => [
        ...prev,
        "<p class='error'>Input a WHOLE number between 0 and 100!</p>",
      ]);
      return;
    }

    setButtonDisabled(true);
    setOutput((prev) => [...prev, "<p>Starting...</p>"]);

    if (jiffClient) {
      let shares = jiffClient.share(number);
      let sum = shares[1];

      for (let i = 2; i <= jiffClient.party_count; i++) {
        sum = sum.sadd(shares[i]);
      }

      const result = await jiffClient.open(sum);
      setOutput((prev) => [...prev, `<p>Result is: ${result.toString()}</p>`]);
      setButtonDisabled(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
        <input
          type="text"
          value={computationId}
          onChange={(e) => setComputationId(e.target.value)}
          placeholder="Computation ID"
          className="w-full text-black p-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
        <input
          type="number"
          value={partyCount}
          onChange={(e) => setPartyCount(parseInt(e.target.value))}
          placeholder="Party Count"
          className="w-full text-black p-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
        <button
          onClick={connect}
          className="w-full bg-purple-600 text-white p-2 rounded-md mb-4 hover:bg-purple-700 disabled:opacity-50"
        >
          Connect
        </button>
        <input
          type="number"
          value={number ?? ""}
          onChange={(e) => setNumber(parseInt(e.target.value))}
          placeholder="Number"
          className="w-full text-black p-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
        <button
          onClick={submit}
          disabled={buttonDisabled}
          className="w-full bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          Submit
        </button>
        <div id="output" className="mt-4">
          {output.map((line, index) => (
            <p key={index} dangerouslySetInnerHTML={{ __html: line }}></p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JiffClientComponent;
