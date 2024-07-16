import React, { useEffect, useRef, useState } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { db } from "../../firebaseConfig.ts";
import { collection, addDoc, deleteDoc, doc, updateDoc, getDocs, query, orderBy, setDoc } from "firebase/firestore";
import './Map.css';

// Interface defining the structure of marker data
interface MarkerData {
    id: string;
    lat: number;
    lng: number;
    number: number;
}

export default function MapComponent() {
    // State variables to manage the map, markers, and their data
    const [map, setMap] = useState<google.maps.Map>();
    const ref = useRef<HTMLDivElement>(null);
    const [markerCluster, setMarkerClusters] = useState<MarkerClusterer>();
    const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
    const [markerData, setMarkerData] = useState<MarkerData[]>([]);
    const [marker, setMarker] = useState<{ lat: number; lng: number } | undefined>();

    // Effect to initialize the map and set up event listeners
    useEffect(() => {
        if (ref.current && !map) {
            setMap(new window.google.maps.Map(ref.current, {
                center: { lat: 49.834, lng: 24.015 },
                zoom: 7,
            }));
        }

        // Add click listener to the map for adding markers
        if (map && !markerCluster) {
            map.addListener('click', (e: google.maps.MapMouseEvent) => {
                if (e.latLng) {
                    const { lat, lng } = e.latLng;
                    setMarker({ lat: lat(), lng: lng() });
                }
            });
            // Initialize marker clusterer
            setMarkerClusters(new MarkerClusterer({ map, markers: [] }));
        }
    }, [map, markerCluster]);

    // Effect to load markers from Firebase into the map
    useEffect(() => {
        const loadMarkers = async () => {
            const questsCollection = collection(db, "quests");
            const snapshot = await getDocs(questsCollection);
            const loadedMarkers: google.maps.Marker[] = [];
            const loadedMarkerData: MarkerData[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                const markerNumber = data.number;
                const newMarker = new window.google.maps.Marker({
                    position: { lat: data.location.lat, lng: data.location.lng },
                    map: map,
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
                                <circle cx="15" cy="15" r="15" fill="#4285F4" />
                                <text x="15" y="20" font-size="15" text-anchor="middle" fill="white" font-family="Arial">${markerNumber}</text>
                            </svg>
                        `),
                        scaledSize: new window.google.maps.Size(30, 30),
                    },
                    draggable: true,
                });

                // Listener to update marker position in Firebase when dragged
                newMarker.addListener('dragend', async () => {
                    const newPosition = newMarker.getPosition();
                    if (newPosition) {
                        newMarker.setPosition(newPosition);
                        const markerDocRef = doc(db, 'quests', doc.id);
                        await updateDoc(markerDocRef, {
                            location: {
                                lat: newPosition.lat(),
                                lng: newPosition.lng()
                            },
                            timestamp: new Date()
                        });
                    }
                });

                loadedMarkers.push(newMarker);
                loadedMarkerData.push({ id: doc.id, lat: data.location.lat, lng: data.location.lng, number: markerNumber }); // Add marker data
                if (markerCluster) {
                    markerCluster.addMarker(newMarker);
                }
            });

            setMarkers(loadedMarkers);
            setMarkerData(loadedMarkerData);
        };

        if (map && markerCluster) {
            loadMarkers();
        }
    }, [map, markerCluster]);

    // Effect to add a new marker to Firebase and the map
    useEffect(() => {
        if (marker && markerCluster) {
            const addMarkerToFirebase = async () => {
                const questsCollection = collection(db, "quests");
                const snapshot = await getDocs(questsCollection);
                let maxNumber = 0;

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.number > maxNumber) {
                        maxNumber = data.number;
                    }
                });

                const newMarkerNumber = maxNumber + 1;
                const newMarkerId = `quest${newMarkerNumber}`;

                await setDoc(doc(questsCollection, newMarkerId), {
                    location: { lat: marker.lat, lng: marker.lng },
                    timestamp: new Date(),
                    number: newMarkerNumber
                });

                const newMarker = new window.google.maps.Marker({
                    position: { lat: marker.lat, lng: marker.lng },
                    map: map,
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
                            <circle cx="15" cy="15" r="15" fill="#4285F4" />
                            <text x="15" y="20" font-size="15" text-anchor="middle" fill="white" font-family="Arial">${newMarkerNumber}</text>
                        </svg>
                    `),
                        scaledSize: new window.google.maps.Size(30, 30),
                    },
                    draggable: true // Allow the marker to be dragged
                });

                // Listener to update marker position in Firebase when dragged
                newMarker.addListener('dragend', async () => {
                    const newPosition = newMarker.getPosition();
                    if (newPosition) {
                        newMarker.setPosition(newPosition); // Update marker position
                        const markerDocRef = doc(db, 'quests', newMarkerId); // Get reference to the marker document
                        await updateDoc(markerDocRef, {
                            location: {
                                lat: newPosition.lat(),
                                lng: newPosition.lng()
                            },
                            timestamp: new Date() // Update timestamp
                        });
                    }
                });

                markerCluster.addMarker(newMarker);
                setMarkers((prevMarkers) => [...prevMarkers, newMarker]);
                setMarkerData((prevData) => [...prevData, { id: newMarkerId, lat: marker.lat, lng: marker.lng, number: newMarkerNumber }]);
            };

            addMarkerToFirebase();
        }
    }, [marker, markerCluster]);

    // Function to clear all markers from the map and Firebase
    const handleClearMarkers = async () => {
        if (markerCluster) {
            markerCluster.clearMarkers();
            setMarkers([]);
            setMarkerData([]);

            // Deleting all marks from Firebase
            const questsCollection = collection(db, "quests");
            const snapshot = await getDocs(questsCollection); // Fetch all markers
            snapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
        }
    };

    // Function to delete a specific marker from the map and Firebase
    const handleDeleteMarker = async (id: string) => {
        if (markerCluster) {
            const markerIndex = markerData.findIndex(marker => marker.id === id);
            if (markerIndex !== -1) {
                const markerToDelete = markers[markerIndex];
                markerCluster.removeMarker(markerToDelete); // Remove marker from cluster
                setMarkers((prevMarkers) => prevMarkers.filter((_, i) => i !== markerIndex));
                setMarkerData((prevData) => prevData.filter(marker => marker.id !== id));

                // Deleting mark from Firebase
                const markerDocRef = doc(db, 'quests', id);
                await deleteDoc(markerDocRef);
            }
        }
    };

    // Render the map and buttons for interaction
    return (
        <div className="wrapper">
            <div ref={ref} className="map"></div> {/* Map container */}
            <div className="buttons-wrapper">
                <div onClick={handleClearMarkers} className="button all">Delete All Markers</div> {/* Button to clear all markers */}
                {markerData.map((marker) => (
                    <div key={marker.id} className="button" onClick={() => handleDeleteMarker(marker.id)}>
                        Delete Marker {marker.number} {/* Button to delete a specific marker */}
                    </div>
                ))}
            </div>
        </div>
    );
}
