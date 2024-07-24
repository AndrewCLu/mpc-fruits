import React, { useState } from "react";
/* @ts-ignore */
import {
  JIFFClient,
  JIFFClientBigNumber,
  /* @ts-ignore */
} from "jiff-mpc";
import { toast } from "sonner";
import { BigNumber } from "bignumber.js";
import Rating from "@mui/material/Rating";

enum OutputState {
  NOT_CONNECTED,
  AWAITING_OTHER_PARTIES_CONNECTION,
  CONNECTED,
  AWAITING_OTHER_PARTIES_INPUTS,
  COMPUTING,
  SHOW_RESULTS,
  ERROR,
}

const fruits = [
  "Apple",
  "Banana",
  "Cherry",
  "Date",
  "Elderberry",
  "Fig",
  "Grape",
  "Honeydew",
  "Kiwi",
  "Lemon",
];

const JiffClientComponent: React.FC = () => {
  const [jiffClient, setJiffClient] = useState<typeof JIFFClient | null>(null);
  const [computationId, setComputationId] = useState<string>("");
  const [partyCount, setPartyCount] = useState<number>(0);
  const [ratings, setRatings] = useState<number[]>(
    Array(fruits.length).fill(0)
  );
  const [output, setOutput] = useState<OutputState>(OutputState.NOT_CONNECTED);
  const [avgResults, setAvgResults] = useState<number[]>([]);
  const [stdResults, setStdResults] = useState<number[]>([]);

  const connect = () => {
    if (!computationId || partyCount < 2) {
      toast.error("Please enter a valid computation ID and party count.");
      return;
    }

    const client = new JIFFClient(
      process.env.NODE_ENV === "development"
        ? "http://localhost:8080"
        : "https://jiff-test.onrender.com",
      computationId,
      {
        autoConnect: false,
        party_count: partyCount,
        crypto_provider: true,
        // @ts-ignore
        onError: (_, error) => {
          console.error(error);
          if (
            error.includes("Maximum parties capacity reached") ||
            error.includes("contradicting party count")
          ) {
            toast.error("Computation is full. Try another computation ID.");
          }
          setOutput(OutputState.ERROR);
        },
        onConnect: () => {
          console.log("Connected to server");
          setOutput(OutputState.CONNECTED);
        },
      }
    );

    client.apply_extension(JIFFClientBigNumber, {});
    client.connect();
    setOutput(OutputState.AWAITING_OTHER_PARTIES_CONNECTION);
    setJiffClient(client);
  };

  const submit = async () => {
    if (ratings.some((rating) => rating < 1 || rating > 5)) {
      toast.error("All ratings must be between 1 and 5.");
      return;
    }

    setOutput(OutputState.AWAITING_OTHER_PARTIES_INPUTS);

    if (jiffClient) {
      console.log(`Beginning MPC with ratings ${ratings}`);
      let shares = await jiffClient.share_array(ratings);
      console.log("Shares: ", shares);
      setOutput(OutputState.COMPUTING);

      // Start average computation
      const startAverageTime = Date.now();

      let sumShares: any[] = [];
      for (let i = 1; i <= jiffClient.party_count; i++) {
        for (let j = 0; j < fruits.length; j++) {
          if (i === 1) {
            sumShares.push(shares[i][j]);
          } else {
            sumShares[j] = sumShares[j].sadd(shares[i][j]);
          }
        }
      }

      // for (let k = 0; k < sumShares.length; k++) {
      //   sumShares[k] = sumShares[k].cdiv(jiffClient.party_count);
      // }
      // console.log("Averaged Sum Shares: ", sumShares);

      const sumResults = await Promise.all(
        sumShares.map((share: any) => jiffClient.open(share))
      );
      console.log("Sum Results: ", sumResults);
      const averageResults = sumResults.map(
        (result: BigNumber) => result.toNumber() / jiffClient.party_count
      );
      console.log("Average Results: ", averageResults);

      const averageTime = Date.now() - startAverageTime;
      console.log("Average Time: ", averageTime);

      // Start standard deviation computation
      const startStdTime = Date.now();

      let squaredSumShares: any[] = [];
      for (let i = 0; i < sumShares.length; i++) {
        squaredSumShares.push(sumShares[i].smult(sumShares[i]));
      }

      let sumOfSquaresShares: any[] = [];
      for (let i = 1; i <= jiffClient.party_count; i++) {
        for (let j = 0; j < sumShares.length; j++) {
          if (j === 0) {
            const x = await jiffClient.open(shares[i][j]);
            console.log("x", i, x.toNumber());
          }
          const shareSquared = shares[i][j].smult(shares[i][j]);
          if (i === 1) {
            sumOfSquaresShares.push(shareSquared);
          } else {
            sumOfSquaresShares[j] = sumOfSquaresShares[j].sadd(shareSquared);
          }
        }
      }
      for (let k = 0; k < sumOfSquaresShares.length; k++) {
        sumOfSquaresShares[k] = sumOfSquaresShares[k].cmult(
          jiffClient.party_count
        );
      }

      let stdResultShares: any[] = [];
      for (let i = 0; i < sumShares.length; i++) {
        const squaredSum = squaredSumShares[i];
        const sumOfSquares = sumOfSquaresShares[i];
        const stdResult = sumOfSquares.ssub(squaredSum);
        stdResultShares.push(stdResult);
      }

      const rawStdResults = await Promise.all(
        stdResultShares.map((diff: any) => jiffClient.open(diff))
      );
      const stdResults = rawStdResults.map((result: BigNumber) =>
        Math.sqrt(
          result.toNumber() /
            (jiffClient.party_count * (jiffClient.party_count - 1))
        )
      );
      console.log("Std Results:", stdResults);

      const stdTime = Date.now() - startStdTime;
      console.log("Std Time: ", stdTime);

      setAvgResults(averageResults);
      setStdResults(stdResults);
      setOutput(OutputState.SHOW_RESULTS);
      toast.success(
        `MPC runtime: ${averageTime}ms for average, ${stdTime}ms for standard deviation`
      );
    }
  };

  const getButtonDisplay = () => {
    switch (output) {
      case OutputState.NOT_CONNECTED:
        return "Connect";
      case OutputState.AWAITING_OTHER_PARTIES_CONNECTION:
        return "Awaiting other parties connection";
      case OutputState.CONNECTED:
        return "Submit ratings to proceed";
      case OutputState.AWAITING_OTHER_PARTIES_INPUTS:
        return "Awaiting other parties inputs";
      case OutputState.COMPUTING:
        return "Computing...";
      case OutputState.SHOW_RESULTS:
        return "Join another fruit rating party";
      case OutputState.ERROR:
        return "Error - please try again";
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4">
      <h1 className="text-6xl text-purple-500 mb-10">Fruits</h1>
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
          disabled={
            output !== OutputState.NOT_CONNECTED &&
            output !== OutputState.SHOW_RESULTS &&
            output !== OutputState.ERROR
          }
          className="w-full bg-purple-600 text-white p-2 rounded-md mb-4 hover:bg-purple-700 disabled:opacity-50"
        >
          {getButtonDisplay()}
        </button>
        {output === OutputState.CONNECTED && (
          <div>
            {fruits.map((fruit, index) => (
              <div key={index} className="mb-4">
                <label className="block text-black mb-2">{fruit}</label>
                <Rating
                  name={`rating-${index}`}
                  value={ratings[index]}
                  onChange={(event, newValue) => {
                    const newRatings = [...ratings];
                    newRatings[index] = newValue || 0;
                    setRatings(newRatings);
                  }}
                  max={5}
                />
              </div>
            ))}
            <button
              onClick={submit}
              className="w-full bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        )}
        {output === OutputState.SHOW_RESULTS && (
          <div className="mt-4 text-black">
            <p className="mb-4 font-bold">
              The fruits have been rated by the crowd.
            </p>
            <ul>
              {fruits
                .map((fruit, index) => ({ fruit, rating: avgResults[index] }))
                .sort((a, b) => b.rating - a.rating)
                .map(({ fruit, rating }, index) => (
                  <li key={index}>
                    {`${fruit}: ${(rating / partyCount).toFixed(
                      1
                    )} (std: ${stdResults[index].toFixed(2)})`}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default JiffClientComponent;
