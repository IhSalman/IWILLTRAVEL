'use client';

/** Live map plus the paid alert buttons (the map stays free; alerts are Starter/Pro). */
import LiveFlightMap from './LiveFlightMap';
import { AircraftAlertButton, TrackFlightButton } from './AlertButtons';

export default function FlightsExperience() {
    return (
        <LiveFlightMap
            renderFlightActions={(live, details) => {
                const number = details?.route?.flightNumber ?? live?.flightNo;
                return number ? <TrackFlightButton key={number} flightNumber={number} /> : null;
            }}
            renderAirportActions={airport => <AircraftAlertButton key={airport.iata} airportIata={airport.iata} />}
        />
    );
}
